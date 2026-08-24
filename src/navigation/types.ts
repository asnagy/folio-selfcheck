/**
 * Screen params.
 *
 * A patron identity is never passed through navigation params — it lives only in
 * the session context, so clearing the session on idle genuinely removes it
 * rather than leaving a copy on the navigation stack.
 */
export type RootStackParamList = {
  Home: undefined;
  SetupRequired: undefined;
  /** Where to go once the patron is identified. */
  PatronSignIn: { next: 'Checkout' | 'Account' };
  Checkout: undefined;
  Account: undefined;
  SessionSummary: undefined;
  Register: undefined;
  AdminPin: undefined;
  Settings: undefined;
};
