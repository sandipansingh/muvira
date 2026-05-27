import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Card, { CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { User, Mail, Phone, Lock } from 'lucide-react';

export const Signup: React.FC = () => {
  const { signup, loading } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basic Validation
    if (!fullName || !email || !phone || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    const success = await signup(email, password, fullName, phone);
    if (success) {
      navigate('/');
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-6 font-instrument">
      <Card className="w-full max-w-md shadow-lg border border-secondary200">
        <CardHeader className="text-center">
          <CardTitle className="text-xl md:text-2xl font-bold tracking-wide">
            Create Account
          </CardTitle>
          <CardDescription>
            Join us to manage orders, customize shipping addresses, and review designs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg text-xs font-semibold text-dangerColor text-center">
                {error}
              </div>
            )}

            <div className="relative">
              <User className="absolute left-3.5 top-[38px] -translate-y-1/2 w-4 h-4 text-secondary400 z-10" />
              <Input
                type="text"
                label="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Asha Roy"
                className="pl-10"
                disabled={loading}
                maxLength={200}
              />
            </div>

            <div className="relative">
              <Mail className="absolute left-3.5 top-[38px] -translate-y-1/2 w-4 h-4 text-secondary400 z-10" />
              <Input
                type="email"
                label="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="asha@example.com"
                className="pl-10"
                disabled={loading}
                maxLength={255}
              />
            </div>

            <div className="relative">
              <Phone className="absolute left-3.5 top-[38px] -translate-y-1/2 w-4 h-4 text-secondary400 z-10" />
              <Input
                type="tel"
                label="Phone Number"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="9876543210"
                className="pl-10"
                disabled={loading}
                maxLength={10}
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3.5 top-[38px] -translate-y-1/2 w-4 h-4 text-secondary400 z-10" />
              <Input
                type="password"
                label="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="pl-10"
                disabled={loading}
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3.5 top-[38px] -translate-y-1/2 w-4 h-4 text-secondary400 z-10" />
              <Input
                type="password"
                label="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="pl-10"
                disabled={loading}
              />
            </div>

            <Button type="submit" loading={loading} className="w-full mt-2">
              Sign Up
            </Button>
          </form>

          <p className="text-xs text-center text-secondary600 mt-6 tracking-wide">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-semibold text-primaryBg hover:text-primaryHover hover:underline"
            >
              Sign In
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Signup;
