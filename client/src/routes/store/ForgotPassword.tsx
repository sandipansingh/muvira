import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Card, { CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Mail, ArrowLeft } from 'lucide-react';
import { useToast } from '../../hooks/useToast';

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    // Simulate API delay
    await new Promise((res) => setTimeout(res, 800));
    setLoading(false);
    setSubmitted(true);
    showToast('Reset email sent!', 'success');
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center py-12 px-6">
      <Card className="w-full max-w-md shadow-lg border border-secondary200">
        <CardHeader className="text-center">
          <CardTitle className="text-xl md:text-2xl font-bold tracking-wide">
            Reset Password
          </CardTitle>
          <CardDescription>
            Enter your email and we'll send reset instructions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!submitted ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3.5 top-[38px] -translate-y-1/2 w-4 h-4 text-secondary400 z-10" />
                <Input
                  type="email"
                  label="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="asha@example.com"
                  className="pl-10"
                  required
                  disabled={loading}
                />
              </div>

              <Button type="submit" loading={loading} className="w-full mt-2">
                Send Reset Link
              </Button>
            </form>
          ) : (
            <div className="text-center py-4 space-y-4">
              <div className="p-4 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs md:text-sm tracking-wide leading-relaxed">
                We have sent password reset instructions to <b>{email}</b>. Please check your inbox and spam folder.
              </div>
              <Button
                variant="outline"
                onClick={() => setSubmitted(false)}
                className="w-full"
              >
                Enter Another Email
              </Button>
            </div>
          )}

          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-secondary600 hover:text-primaryBg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPassword;
