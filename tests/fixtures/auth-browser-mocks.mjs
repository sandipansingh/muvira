// Isolated browser fixtures: no credentials or external provider requests.
export const authBrowserMocks = {
  supabase: `
const listeners = new Set();
let session = sessionStorage.getItem('auth-fixture-session') ? {access_token:'fixture-only'} : null;
const control = window.authFixture = {
  credentials: 'success', signup: 'confirmation', profile: 'success', recovery: 'success', signout: 'success', role: 'customer',
  delay: {}, pending: {}, calls: {},
  release(name) { this.delay[name] = false; (this.pending[name] || []).splice(0).forEach(done => done()); },
};
export async function gate(name) {
  control.calls[name] = (control.calls[name] || 0) + 1;
  if (control.delay[name]) await new Promise(done => (control.pending[name] ||= []).push(done));
}
function signedIn() { session = {access_token:'fixture-only'}; sessionStorage.setItem('auth-fixture-session','1'); listeners.forEach(fn => fn('SIGNED_IN',session)); return session; }
export const supabase = {auth:{
  getSession: async () => ({data:{session}}),
  updateUser: async () => ({error:null}),
  onAuthStateChange: fn => { listeners.add(fn); return {data:{subscription:{unsubscribe:()=>listeners.delete(fn)}}}; },
  signInWithPassword: async () => { await gate('credentials'); return control.credentials === 'failure' ? {data:{session:null},error:{message:'Invalid login credentials'}} : {data:{session:signedIn()},error:null}; },
  signUp: async () => { await gate('signup'); return control.signup === 'failure' ? {data:{session:null},error:{message:'Unable to create account'}} : {data:{session:control.signup === 'confirmation' ? null : signedIn()},error:null}; },
  signOut: async () => { await gate('signout'); if(control.signout==='failure')return {error:new Error('Sign out unavailable')}; session = null; sessionStorage.removeItem('auth-fixture-session'); listeners.forEach(fn => fn('SIGNED_OUT',null)); return {error:null}; },
  resetPasswordForEmail: async (email, options) => { control.reset = {email,options}; await gate('recovery'); return {error:control.recovery === 'failure' ? {message:'Reset email unavailable'} : null}; },
}};`,
  'auth.service': `import {gate} from './supabase';
export const authApiService = {
  getProfile: async () => { await gate('profile'); if(window.authFixture.profile === 'failure') throw new Error('Account temporarily unavailable'); return {success:true,data:{id:'fixture-user',email:'aarohi@example.test',fullName:'Aarohi Sen',phone:'9000000000',role:window.authFixture.role}}; },
};`,
}
