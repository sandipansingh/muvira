// Mutations exist only in the explicitly enabled, isolated account test server.
const helper = `
const ok = data => ({success:true,data});
const control = window.accountFixture ||= {
  calls: [], delay: {}, failure: {}, pending: {},
  release(name) { this.delay[name] = false; (this.pending[name] || []).splice(0).forEach(done => done()); },
};
async function accountGate(name, data) {
  control.calls.push({name,data});
  if(control.delay[name]) await new Promise(done => (control.pending[name] ||= []).push(done));
  if(control.failure[name]) throw new Error(control.failure[name]);
}
const addresses = () => window.fixture.addresses ||= [window.fixture.address];
`
export const accountBrowserMocks = {
  'auth.service': `import {gate} from './supabase'; ${helper}
    export const authApiService = {
      getProfile: async () => { await gate('profile'); return ok(window.fixture.auth.user); },
      updateProfile: async data => { await accountGate('profileSave', data); window.fixture.auth.user = {...window.fixture.auth.user,...data}; return ok(window.fixture.auth.user); },
    };`,
  'address.service': `${helper}
    export const addressService = {
      getAddresses: async () => { await accountGate('addressLoad'); return ok(addresses().map(address=>({...address}))); },
      createAddress: async data => { await accountGate('addressCreate', data); const address = {...data,id:'new-address'}; if(address.isDefault)addresses().forEach(item=>item.isDefault=false); addresses().push(address); return ok(address); },
      updateAddress: async (id,data) => { await accountGate('addressEdit', data); const address={...data,id}; window.fixture.addresses=addresses().map(item=>item.id===id?address:item); return ok(address); },
      deleteAddress: async id => { await accountGate('addressDelete', id); window.fixture.addresses=addresses().filter(item=>item.id!==id); return ok(null); },
      setDefaultAddress: async id => { await accountGate('addressDefault', id); addresses().forEach(item=>item.isDefault=item.id===id); return ok(addresses().find(item=>item.id===id)); },
    };`,
  'notification.service': `${helper}
    export const notificationService = {
      getPreferences: async () => { await accountGate('preferencesLoad'); return ok({emailEnabled:control.emailEnabled ?? true}); },
      updatePreferences: async emailEnabled => { await accountGate('preferencesSave', emailEnabled); control.emailEnabled=emailEnabled; return ok({emailEnabled}); },
    };`,
}
