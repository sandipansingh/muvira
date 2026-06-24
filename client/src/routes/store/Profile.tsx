import React, { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import { addressesApiService } from "../../lib/api/addresses";
import type { Address } from "../../types/cart";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import Card, {
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../../components/ui/Card";
import Dialog from "../../components/ui/Dialog";
import Breadcrumb from "../../components/layout/Breadcrumb";
import {
  User,
  Phone,
  Mail,
  MapPin,
  Plus,
  Trash2,
  Home,
  Building,
  CheckCircle2,
  Pencil,
} from "lucide-react";

export const Profile: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const { showToast } = useToast();

  const [fullName, setFullName] = useState(user?.fullName || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [addresses, setAddresses] = useState<Address[]>([]);

  const [loading, setLoading] = useState(false);
  const [loadingAddresses, setLoadingAddresses] = useState(false);

  // Address edit modal state
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState("home");
  const [newFullName, setNewFullName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newLine1, setNewLine1] = useState("");
  const [newLine2, setNewLine2] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newState, setNewState] = useState("");
  const [newPincode, setNewPincode] = useState("");
  const [newIsDefault, setNewIsDefault] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);

  useEffect(() => {
    fetchAddresses();
  }, []);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName);
      setPhone(user.phone);
    }
  }, [user]);

  const fetchAddresses = async () => {
    setLoadingAddresses(true);
    const res = await addressesApiService.getAddresses();
    if (res.success) {
      setAddresses(res.data);
    }
    setLoadingAddresses(false);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !phone) return;

    setLoading(true);
    await updateProfile(fullName, phone);
    setLoading(false);
  };

  const handleOpenAddAddress = () => {
    setEditId(null);
    setNewLabel("home");
    setNewFullName("");
    setNewPhone("");
    setNewLine1("");
    setNewLine2("");
    setNewCity("");
    setNewState("");
    setNewPincode("");
    setNewIsDefault(false);
    setAddressModalOpen(true);
  };

  const handleOpenEditAddress = (addr: Address) => {
    setEditId(addr.id);
    setNewLabel(addr.label);
    setNewFullName(addr.fullName);
    setNewPhone(addr.phone);
    setNewLine1(addr.line1);
    setNewLine2(addr.line2 || "");
    setNewCity(addr.city);
    setNewState(addr.state);
    setNewPincode(addr.pincode);
    setNewIsDefault(addr.isDefault);
    setAddressModalOpen(true);
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !newFullName ||
      !newPhone ||
      !newLine1 ||
      !newCity ||
      !newState ||
      !newPincode
    ) {
      showToast("Please fill in all mandatory fields.", "error");
      return;
    }

    setSavingAddress(true);
    let res;
    if (editId) {
      res = await addressesApiService.updateAddress(editId, {
        label: newLabel,
        fullName: newFullName,
        phone: newPhone,
        line1: newLine1,
        line2: newLine2 || null,
        city: newCity,
        state: newState,
        pincode: newPincode,
        isDefault: newIsDefault,
      });
    } else {
      res = await addressesApiService.createAddress({
        label: newLabel,
        fullName: newFullName,
        phone: newPhone,
        line1: newLine1,
        line2: newLine2 || null,
        city: newCity,
        state: newState,
        pincode: newPincode,
        country: "India",
        isDefault: newIsDefault,
      });
    }
    setSavingAddress(false);

    if (res.success) {
      showToast(editId ? "Address updated" : "Address added", "success");
      setAddressModalOpen(false);
      fetchAddresses();
    } else {
      showToast(res.error.message || "Failed to save address", "error");
    }
  };

  const handleDeleteAddress = async (id: string) => {
    if (!confirm("Are you sure you want to delete this address?")) return;
    const res = await addressesApiService.deleteAddress(id);
    if (res.success) {
      showToast("Address deleted successfully", "success");
      fetchAddresses();
    } else {
      showToast(res.error.message || "Failed to delete address", "error");
    }
  };

  const handleSetDefault = async (id: string) => {
    const res = await addressesApiService.setDefaultAddress(id);
    if (res.success) {
      showToast("Default address updated", "success");
      fetchAddresses();
    } else {
      showToast(res.error.message || "Failed to set default address", "error");
    }
  };

  return (
    <div className="max-w-[1240px] mx-auto px-6 py-6 font-instrument text-left">
      <Breadcrumb items={[{ label: "Profile Account" }]} />

      <h1 className="text-xl md:text-2xl font-bold tracking-wide text-darkColor my-6">
        My Account Settings
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* EDIT PROFILE INFO */}
        <div>
          <Card className="border border-secondary200">
            <CardHeader>
              <CardTitle>Profile Details</CardTitle>
              <CardDescription>Edit your details below</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="relative">
                  <User className="absolute left-3.5 top-[38px] -translate-y-1/2 w-4 h-4 text-secondary400 z-10" />
                  <Input
                    label="Full Name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-10 text-xs md:text-sm"
                    required
                    disabled={loading}
                  />
                </div>

                <div className="relative">
                  <Mail className="absolute left-3.5 top-[38px] -translate-y-1/2 w-4 h-4 text-secondary400 z-10" />
                  <Input
                    label="Email Address"
                    value={user?.email || ""}
                    className="pl-10 text-xs md:text-sm bg-lightgrayColor cursor-not-allowed opacity-75"
                    readOnly
                    disabled={true}
                  />
                </div>

                <div className="relative">
                  <Phone className="absolute left-3.5 top-[38px] -translate-y-1/2 w-4 h-4 text-secondary400 z-10" />
                  <Input
                    label="Phone Number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pl-10 text-xs md:text-sm"
                    required
                    disabled={loading}
                  />
                </div>

                <Button
                  type="submit"
                  loading={loading}
                  className="w-full mt-2 text-xs md:text-sm"
                >
                  Save Settings
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* ADDRESSES BOOK */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border border-secondary200">
            <div className="p-5 border-b border-secondary200 flex justify-between items-center bg-lightgrayColor/30">
              <div>
                <h3 className="text-sm font-bold text-darkColor uppercase tracking-widest flex items-center gap-2">
                  <MapPin className="w-4.5 h-4.5 text-primaryBg" />
                  Address Book
                </h3>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenAddAddress}
                className="text-xs bg-white py-1.5 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Address
              </Button>
            </div>
            <CardContent className="p-5">
              {loadingAddresses ? (
                <div className="space-y-3">
                  <div className="h-20 bg-gray-100 animate-pulse rounded-lg" />
                  <div className="h-20 bg-gray-100 animate-pulse rounded-lg" />
                </div>
              ) : addresses.length === 0 ? (
                <div className="text-center py-6 text-xs text-secondary500 leading-relaxed">
                  No addresses saved. Press 'Add Address' to set up shipping
                  locations.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {addresses.map((addr) => (
                    <div
                      key={addr.id}
                      className="p-4 rounded-xl border border-secondary200 text-left flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="border border-secondary300 text-secondary600 text-[10px] font-medium px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1">
                            {addr.label === "home" && (
                              <Home className="w-3 h-3" />
                            )}
                            {addr.label === "office" && (
                              <Building className="w-3 h-3" />
                            )}
                            {addr.label}
                          </span>
                          {addr.isDefault && (
                            <span className="text-secondary500 border border-secondary300 text-[9px] font-medium px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-0.5">
                              <CheckCircle2 className="w-3 h-3 shrink-0 text-secondary400" />{" "}
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-darkColor mb-1">
                          {addr.fullName}
                        </p>
                        <p className="text-xs text-secondary600 mb-1 leading-snug">
                          {addr.line1}, {addr.line2 && `${addr.line2}, `}
                          {addr.city}, {addr.state} - {addr.pincode}
                        </p>
                        <p className="text-xs font-normal text-secondary600 font-instrument">
                          {addr.phone}
                        </p>
                      </div>

                      <div className="border-t border-secondary200/50 mt-4 pt-3.5 flex items-center justify-between">
                        {!addr.isDefault ? (
                          <button
                            onClick={() => handleSetDefault(addr.id)}
                            className="text-[10px] font-medium text-primaryBg hover:text-primaryHover uppercase tracking-wider"
                          >
                            Set Default
                          </button>
                        ) : (
                          <div />
                        )}
                        <div className="flex gap-4">
                          <button
                            onClick={() => handleOpenEditAddress(addr)}
                            className="text-secondary500 hover:text-darkColor transition-colors"
                            title="Edit Address"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteAddress(addr.id)}
                            className="text-secondary500 hover:text-rose-600 transition-colors"
                            title="Delete Address"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ADDRESS ADD/EDIT DIALOG */}
      <Dialog
        isOpen={addressModalOpen}
        onClose={() => setAddressModalOpen(false)}
        title={editId ? "Edit Address" : "Add New Address"}
      >
        <form onSubmit={handleSaveAddress} className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <Button
              type="button"
              variant={newLabel === "home" ? "primary" : "secondary"}
              size="sm"
              onClick={() => setNewLabel("home")}
              className="py-2 text-xs"
            >
              Home
            </Button>
            <Button
              type="button"
              variant={newLabel === "office" ? "primary" : "secondary"}
              size="sm"
              onClick={() => setNewLabel("office")}
              className="py-2 text-xs"
            >
              Office
            </Button>
            <Button
              type="button"
              variant={newLabel === "other" ? "primary" : "secondary"}
              size="sm"
              onClick={() => setNewLabel("other")}
              className="py-2 text-xs"
            >
              Other
            </Button>
          </div>

          <Input
            label="Receiver's Full Name *"
            value={newFullName}
            onChange={(e) => setNewFullName(e.target.value)}
            placeholder="Asha Roy"
          />

          <Input
            label="Phone Number *"
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            placeholder="+919876543210"
          />

          <Input
            label="Address Line 1 *"
            value={newLine1}
            onChange={(e) => setNewLine1(e.target.value)}
            placeholder="Flat/House No., Street name"
          />

          <Input
            label="Address Line 2"
            value={newLine2}
            onChange={(e) => setNewLine2(e.target.value)}
            placeholder="Landmark, Sector"
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="City *"
              value={newCity}
              onChange={(e) => setNewCity(e.target.value)}
              placeholder="Kolkata"
            />
            <Input
              label="State *"
              value={newState}
              onChange={(e) => setNewState(e.target.value)}
              placeholder="West Bengal"
            />
          </div>

          <Input
            label="Pincode *"
            value={newPincode}
            onChange={(e) => setNewPincode(e.target.value)}
            placeholder="700016"
          />

          <label className="flex items-center gap-2 cursor-pointer py-1">
            <input
              type="checkbox"
              checked={newIsDefault}
              onChange={(e) => setNewIsDefault(e.target.checked)}
              className="w-4 h-4 accent-primaryBg"
            />
            <span className="text-xs font-semibold text-secondary600">
              Set as default address
            </span>
          </label>

          <Button
            type="submit"
            loading={savingAddress}
            className="w-full py-2.5"
          >
            {editId ? "Save Address" : "Add Shipping Location"}
          </Button>
        </form>
      </Dialog>
    </div>
  );
};

export default Profile;
