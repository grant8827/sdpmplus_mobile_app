import React, { useCallback, useEffect, useState } from 'react';
import { AppState, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { SubTabs } from '../../components/SubTabs';
import { Banner, Button, COLORS, Card, EmptyText, Heading, Muted, Pill, Row, confirm, errorText } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { api, type BillingInterval, type SchoolPlanOption, type SchoolSubscriptionView } from '../../services/api';
import { formatMoney, limitLabel, planPriceLabel, priceLabel } from '../../utils/plans';

const STATUS: Record<NonNullable<SchoolSubscriptionView['subscription']>['status'], { label: string; tone: 'green' | 'blue' | 'red' | 'grey' }> = {
  TRIALING: { label: 'Free trial', tone: 'blue' }, ACTIVE: { label: 'Active', tone: 'green' }, PAST_DUE: { label: 'Payment overdue', tone: 'red' }, CANCELED: { label: 'Canceled', tone: 'grey' },
};
const INVOICE_STATUS = { DRAFT: 'Draft', OPEN: 'Unpaid', PAID: 'Paid', VOID: 'Cancelled' } as const;

/** How full the plan is, in words. */
function capacityNote(data: SchoolSubscriptionView): string | null {
  if (data.studentLimit === null) return null;
  if (data.level === 'FULL') return "Your plan is full. You can keep using everything, but new students can't be added until you choose a larger plan or remove students who have left.";
  if (data.level === 'CLOSE' || data.level === 'NEAR') return `Your plan is ${data.percentUsed}% full: ${data.remaining} more ${data.remaining === 1 ? 'student fits' : 'students fit'}.`;
  return null;
}

/**
 * Admin → Subscription, same as the website's: the school's plan and
 * price, active students against the plan's limit, the trial or renewal
 * date, the plans, and invoices. Paying by card opens our payment
 * provider's secure page in the phone's browser; the page refreshes
 * when the administrator comes back to the app. Every plan includes
 * every feature.
 */
export function SubscriptionScreen() {
  const { token } = useAuth();
  const [data, setData] = useState<SchoolSubscriptionView | null>(null);
  const [interval, setBillingInterval] = useState<BillingInterval>('MONTH');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const next = await api.mySubscription(token);
      setData(next);
      setBillingInterval(current => (next.subscription && next.subscription.status !== 'TRIALING' ? next.subscription.interval : current));
    } catch (error) { setMessage(errorText(error, 'Could not load your subscription')); }
  }, [token]);
  useEffect(() => { load(); }, [load]);
  // Coming back from the payment page in the browser: show the new state.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') load(); });
    return () => subscription.remove();
  }, [load]);

  const run = async (action: () => Promise<string>) => {
    setBusy(true);
    setMessage('');
    try { setMessage(await action()); await load(); } catch (error) { setMessage(errorText(error, 'Something went wrong')); } finally { setBusy(false); }
  };

  const choose = async (plan: SchoolPlanOption) => {
    if (!token || !data) return;
    const describe = `${plan.name} (${limitLabel(plan.studentLimit).toLowerCase()})`;
    if (data.onlinePayment && !plan.customPricing) {
      const price = planPriceLabel(plan, interval);
      const trial = data.subscription?.status === 'TRIALING' && !data.subscription.trialEnded ? ` Your free trial continues until ${data.subscription.trialEndsOn}; the first charge is on that day.` : '';
      const ok = data.paidOnline
        ? await confirm(`Switch to ${plan.name}?`, `Move your school to ${describe} at ${price}. The change is immediate, and the difference for the rest of this billing period is added to, or taken off, your next bill.`, 'Switch plan')
        : await confirm(`Subscribe to ${plan.name}?`, `${describe} at ${price}. You'll enter your card on our payment provider's secure page.${trial}`, 'Continue');
      if (!ok) return;
      run(async () => {
        const result = await api.subscriptionCheckout(token, { planId: plan.id, interval, confirm: true });
        if (result.url) { await Linking.openURL(result.url); return 'Finish the payment in your browser, then come back here.'; }
        return `Your school is now on ${plan.name}.`;
      });
      return;
    }
    const price = plan.customPricing ? 'a price we will agree with you' : planPriceLabel(plan, interval);
    if (!(await confirm(`Ask for ${plan.name}?`, `Ask to move your school to ${describe} at ${price}. This changes what your school is billed. Nothing changes until our team confirms it.`, 'Send request'))) return;
    run(async () => { await api.requestSubscriptionChange(token, { type: 'CHANGE_PLAN', planId: plan.id, interval, confirm: true }); return `We received your request for ${plan.name}. We'll confirm it shortly.`; });
  };

  const cancel = async () => {
    if (!token || !data) return;
    if (data.paidOnline) {
      if (!(await confirm('Cancel subscription?', 'It stays active until the end of the period you have paid for, and you can undo this before then.', 'Cancel subscription', true))) return;
      run(async () => { await api.cancelPaidSubscription(token, { confirm: true }); return 'Your subscription will end at the end of the paid period.'; });
      return;
    }
    if (!(await confirm('Ask to cancel?', 'Your subscription stays active until the end of the period you have paid for. Nothing changes until our team confirms it.', 'Send request', true))) return;
    run(async () => { await api.requestSubscriptionChange(token, { type: 'CANCEL', confirm: true }); return "We received your cancellation request. We'll confirm it shortly."; });
  };
  const undoCancel = () => { if (token) run(async () => { await api.cancelPaidSubscription(token, { resume: true }); return 'Your subscription will continue.'; }); };
  const openPortal = () => { if (token) run(async () => { await Linking.openURL((await api.billingPortal(token)).url); return 'Opening your card and receipts in your browser.'; }); };
  const withdraw = (requestId: string) => { if (token) run(async () => { await api.withdrawSubscriptionRequest(token, requestId); return 'Request withdrawn.'; }); };

  if (!data) {
    return <Screen title="Subscription" subtitle="Your school's plan and billing."><Banner text={message} onDismiss={() => setMessage('')} />{!message && <EmptyText>Loading…</EmptyText>}</Screen>;
  }

  const sub = data.subscription;
  const note = capacityNote(data);
  const sameChoice = (plan: SchoolPlanOption) => plan.current && sub?.status !== 'TRIALING' && sub?.status !== 'CANCELED' && sub?.interval === interval;
  const buttonLabel = (plan: SchoolPlanOption) =>
    plan.tooSmall ? `Too small for ${data.activeStudents} students`
      : sameChoice(plan) ? 'Current plan'
        : plan.current && sub?.status !== 'TRIALING' && sub?.status !== 'CANCELED' ? `Switch to ${interval === 'YEAR' ? 'annual' : 'monthly'}`
          : plan.customPricing ? 'Ask about this plan'
            : data.paidOnline ? 'Switch to this plan' : data.onlinePayment ? 'Pay by card' : 'Choose this plan';
  const barColor = data.level === 'FULL' ? COLORS.red : data.level === 'OK' ? COLORS.green : COLORS.amber;

  return (
    <Screen title="Subscription" subtitle="Your school's plan and billing. Every plan includes every feature.">
      <Banner text={message} onDismiss={() => setMessage('')} />

      <Card>
        {sub ? (
          <>
            <View style={styles.header}>
              <Heading>{sub.planName}</Heading>
              <Pill label={STATUS[sub.status].label} tone={STATUS[sub.status].tone} />
            </View>
            <Text style={styles.body}>
              {sub.status === 'TRIALING'
                ? sub.trialEnded
                  ? 'Your free trial has ended. Choose a plan below to continue.'
                  : data.paidOnline
                    ? `Free trial until ${sub.trialEndsOn} (${sub.trialDaysLeft} ${sub.trialDaysLeft === 1 ? 'day' : 'days'} left). Then ${priceLabel(sub.priceCents, sub.interval, sub.currency)}, charged to your card.`
                    : `Free trial with every feature: ${sub.trialDaysLeft} ${sub.trialDaysLeft === 1 ? 'day' : 'days'} left (ends ${sub.trialEndsOn}). No card needed.`
                : `${priceLabel(sub.priceCents, sub.interval, sub.currency)}${sub.currentPeriodEnd ? ` · ${sub.cancelAtPeriodEnd || sub.status === 'CANCELED' ? 'ends' : 'renews'} ${sub.currentPeriodEnd}` : ''}`}
            </Text>
            {sub.cancelAtPeriodEnd && <Muted>Your subscription is set to end on {sub.currentPeriodEnd}.</Muted>}
            {sub.status === 'PAST_DUE' && <Text style={styles.alert}>A payment didn't go through. Drop-off, pickup and attendance keep working. {data.paidOnline ? 'Please update the card on file.' : 'Please contact us to settle the invoice.'}</Text>}
            {data.lapsed && <Text style={styles.alert}>New students can't be added until your school is on a plan. Everything else, including drop-off, pickup and attendance, keeps working.</Text>}
          </>
        ) : (
          <Text style={styles.body}>Your school isn't on a plan yet, so there is no student limit. Choose one below when you're ready.</Text>
        )}

        <View style={styles.header}>
          <Text style={styles.strong}>{data.activeStudents.toLocaleString('en-US')} active {data.activeStudents === 1 ? 'student' : 'students'}</Text>
          <Text style={styles.body}>{data.studentLimit === null ? 'No limit' : `${data.remaining?.toLocaleString('en-US')} of ${data.studentLimit.toLocaleString('en-US')} places left`}</Text>
        </View>
        {data.studentLimit !== null && (
          <View style={styles.bar} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: data.studentLimit, now: data.activeStudents }}>
            <View style={[styles.barFill, { width: `${Math.min(100, data.percentUsed ?? 0)}%`, backgroundColor: barColor }]} />
          </View>
        )}
        {note && <Text style={data.level === 'FULL' ? styles.alert : styles.warn}>{note}</Text>}
        <Muted>Only active students count. Suspended and removed students, parents, teachers and staff do not.</Muted>

        {data.paidOnline && (
          <Row>
            <Button label="Card on file and receipts" variant="secondary" small onPress={openPortal} disabled={busy} />
            {sub?.cancelAtPeriodEnd && <Button label="Keep my subscription" variant="secondary" small onPress={undoCancel} disabled={busy} />}
          </Row>
        )}
      </Card>

      {data.openRequest && (
        <Card>
          <Text style={styles.strong}>Waiting for approval</Text>
          <Text style={styles.body}>
            {data.openRequest.type === 'CANCEL' ? 'Cancel the subscription.' : `Move to ${data.openRequest.planName}, billed every ${data.openRequest.interval === 'YEAR' ? 'year' : 'month'}.`}
          </Text>
          <Muted>Asked by {data.openRequest.requestedBy}. Nothing changes until our team confirms it.</Muted>
          <Button label="Withdraw request" variant="secondary" small onPress={() => withdraw(data.openRequest!.id)} disabled={busy} />
        </Card>
      )}

      <Heading>Plans</Heading>
      <SubTabs tabs={[{ key: 'MONTH', label: 'Monthly' }, { key: 'YEAR', label: 'Annual (2 months free)' }]} active={interval} onChange={setBillingInterval} />
      {data.plans.map(plan => {
        const blockedByRequest = Boolean(data.openRequest) && (!data.onlinePayment || plan.customPricing);
        return (
          <Card key={plan.id} style={plan.current ? styles.currentPlan : undefined}>
            <View style={styles.header}>
              <Text style={styles.planName}>{plan.name}</Text>
              {plan.current ? <Pill label="Your plan" tone="blue" /> : plan.recommended ? <Pill label="Recommended" tone="green" /> : null}
            </View>
            <Text style={styles.price}>{planPriceLabel(plan, interval)}</Text>
            <Text style={styles.body}>{limitLabel(plan.studentLimit)}</Text>
            <Muted>{plan.customPricing ? "We'll agree a price with you." : 'Every feature included.'}</Muted>
            <Button label={buttonLabel(plan)} variant={plan.recommended ? 'primary' : 'secondary'} small onPress={() => choose(plan)} disabled={busy || plan.tooSmall || sameChoice(plan) || blockedByRequest} />
          </Card>
        );
      })}
      <Muted>
        {data.onlinePayment
          ? "Card payments are taken on our payment provider's secure page; we never see or store your card number. Custom-priced plans are arranged with our team."
          : 'Choosing a plan sends a request; our team confirms it before anything is billed.'}
      </Muted>
      {sub && sub.status !== 'CANCELED' && !sub.cancelAtPeriodEnd && (
        <TouchableOpacity onPress={cancel} disabled={busy || (Boolean(data.openRequest) && !data.paidOnline)} accessibilityRole="button">
          <Text style={styles.link}>Cancel subscription</Text>
        </TouchableOpacity>
      )}

      <Heading>Invoices and payments</Heading>
      {data.invoices.length === 0 ? <EmptyText>No invoices yet.</EmptyText> : data.invoices.map(invoice => (
        <Card key={invoice.id}>
          <View style={styles.header}>
            <Text style={styles.strong}>{invoice.number}</Text>
            <Pill label={invoice.overdue ? 'Overdue' : INVOICE_STATUS[invoice.status]} tone={invoice.overdue ? 'red' : invoice.status === 'PAID' ? 'green' : 'grey'} />
          </View>
          <Text style={styles.body}>{invoice.description}</Text>
          <Muted>{formatMoney(invoice.amountCents, invoice.currency)}{invoice.status !== 'PAID' && invoice.dueOn ? ` · due ${invoice.dueOn}` : ''}</Muted>
          {invoice.hostedUrl && <Button label="View receipt" variant="secondary" small onPress={() => Linking.openURL(invoice.hostedUrl!)} />}
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  body: { fontSize: 14, color: COLORS.slate },
  strong: { fontSize: 15, fontWeight: '700', color: COLORS.slate },
  planName: { fontSize: 16, fontWeight: '700', color: COLORS.slate },
  price: { fontSize: 20, fontWeight: '700', color: COLORS.navy },
  bar: { height: 10, borderRadius: 999, backgroundColor: '#E5E7EB', overflow: 'hidden' },
  barFill: { height: 10, borderRadius: 999 },
  alert: { fontSize: 14, color: COLORS.slate, borderLeftWidth: 4, borderLeftColor: COLORS.red, paddingLeft: 10 },
  warn: { fontSize: 14, color: COLORS.slate, borderLeftWidth: 4, borderLeftColor: COLORS.amber, paddingLeft: 10 },
  currentPlan: { borderColor: COLORS.blue, borderWidth: 1 },
  link: { color: COLORS.blue, fontWeight: '600', fontSize: 14, paddingVertical: 8 },
});
