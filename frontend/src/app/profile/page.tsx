'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { authApi, walletApi } from '@/lib/api';
import { formatVND } from '@/lib/utils';
import { Alert } from '@/components/ui/Alert';
import { PageLoading } from '@/components/ui/LoadingSpinner';

export default function ProfilePage() {
  const { isAuthenticated, isLoading, user, setUser } = useAuth();
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [toppingUp, setToppingUp] = useState(false);
  const [topupMsg, setTopupMsg] = useState('');

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login?redirect=/profile');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName ?? '');
      setPhone(user.phone ?? '');
    }
  }, [user]);

  useEffect(() => {
    if (isAuthenticated) {
      walletApi.getBalance().then((r) => setWalletBalance(r.balance)).catch(() => {});
    }
  }, [isAuthenticated]);

  if (isLoading) return <PageLoading />;
  if (!user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const updated = await authApi.updateMe({ fullName, phone });
      setUser(updated as any);
      setMsg({ type: 'success', text: 'Cập nhật thông tin thành công!' });
    } catch {
      setMsg({ type: 'error', text: 'Cập nhật thất bại, vui lòng thử lại' });
    } finally {
      setSaving(false);
    }
  };

  const handleTopUp = async () => {
    setToppingUp(true);
    setTopupMsg('');
    try {
      const r = await walletApi.topUp();
      setWalletBalance(r.balance);
      setTopupMsg('Nạp 500.000 ₫ thành công!');
    } catch {
      setTopupMsg('Nạp tiền thất bại');
    } finally {
      setToppingUp(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Thông tin cá nhân</h1>

      {/* Ví EcomPay */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-semibold text-gray-900">💰 Ví EcomPay</h2>
          <span className="text-xs text-gray-400">Dùng để thanh toán đơn hàng</span>
        </div>

        <div className="flex items-center justify-between mt-4">
          <div>
            <p className="text-sm text-gray-500">Số dư hiện tại</p>
            <p className="text-3xl font-bold text-blue-600 mt-1">
              {walletBalance !== null ? formatVND(walletBalance) : '---'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleTopUp}
            disabled={toppingUp}
            className="btn-primary px-5 py-2 text-sm"
          >
            {toppingUp ? 'Đang nạp...' : '+ Nạp 500.000 ₫'}
          </button>
        </div>

        {topupMsg && (
          <p className={`text-sm mt-3 ${topupMsg.includes('thành công') ? 'text-green-600' : 'text-red-500'}`}>
            {topupMsg}
          </p>
        )}

        <p className="text-xs text-gray-400 mt-3">
          Demo: mỗi lần nạp +500.000 ₫. Số dư được trừ tự động khi thanh toán bằng EcomPay.
        </p>
      </div>

      {/* Thông tin cá nhân */}
      <div className="card p-6">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
          <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center text-white text-2xl font-bold shrink-0">
            {(user.fullName ?? user.email).charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{user.fullName}</p>
            <p className="text-sm text-gray-500">{user.email}</p>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full mt-1 inline-block">
              {user.role === 'admin' ? '👑 Admin' : '👤 Người dùng'}
            </span>
          </div>
        </div>

        {msg && <Alert type={msg.type} message={msg.text} />}

        <form onSubmit={handleSubmit} className="space-y-4 mt-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên</label>
            <input
              type="text"
              required
              className="input-field"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              disabled
              className="input-field bg-gray-50 cursor-not-allowed"
              value={user.email}
            />
            <p className="text-xs text-gray-400 mt-1">Email không thể thay đổi</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
            <input
              type="tel"
              className="input-field"
              placeholder="0912345678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </form>
      </div>
    </div>
  );
}
