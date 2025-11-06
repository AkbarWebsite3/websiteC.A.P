import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { supabase } from './lib/supabase';
import { hashPassword, verifyPassword } from './lib/crypto';
import { User, Lock, Mail, Building2, MapPin, Phone } from 'lucide-react';

const AuthPage = () => {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    companyName: '',
    address: '',
    phoneNumber: ''
  });
  const [resetEmail, setResetEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const { data, error: fetchError } = await supabase
        .from('catalog_users')
        .select('*')
        .eq('email', formData.email)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!data) {
        setError('Неверный email или пароль');
        return;
      }

      if (data.status === 'pending') {
        setError('Ваш запрос на регистрацию ожидает одобрения администратором');
        return;
      }

      if (data.status === 'rejected') {
        setError('Ваш запрос на регистрацию был отклонен');
        return;
      }

      const isPasswordValid = await verifyPassword(formData.password, data.password_hash);

      if (!isPasswordValid) {
        setError('Неверный email или пароль');
        return;
      }

      localStorage.setItem('catalogUser', JSON.stringify(data));
      window.location.href = '/catalog.html';
    } catch (error: any) {
      setError('Ошибка входа: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      if (formData.password !== formData.confirmPassword) {
        setError('Пароли не совпадают');
        return;
      }

      if (formData.password.length < 6) {
        setError('Пароль должен содержать минимум 6 символов');
        return;
      }

      const { data: existingUser } = await supabase
        .from('catalog_users')
        .select('email')
        .eq('email', formData.email)
        .maybeSingle();

      if (existingUser) {
        setError('Пользователь с таким email уже существует');
        return;
      }

      const passwordHash = await hashPassword(formData.password);

      const { error } = await supabase
        .from('catalog_users')
        .insert([{
          name: formData.name,
          email: formData.email,
          password_hash: passwordHash,
          phone_number: formData.phoneNumber,
          address: formData.address,
          company_name: formData.companyName,
          status: 'pending'
        }]);

      if (error) throw error;

      setSuccess('Запрос на регистрацию отправлен! Ожидайте одобрения администратора.');
      setFormData({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        companyName: '',
        address: '',
        phoneNumber: ''
      });
    } catch (error: any) {
      setError('Ошибка регистрации: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!resetEmail) {
      setError('Введите email');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const { data: user } = await supabase
        .from('catalog_users')
        .select('id, email')
        .eq('email', resetEmail)
        .maybeSingle();

      if (!user) {
        setError('Пользователь с таким email не найден');
        return;
      }

      const resetCode = Math.random().toString(36).substring(2, 10).toUpperCase();

      const { error } = await supabase
        .from('verification_codes')
        .insert([{
          email: resetEmail,
          code: resetCode,
          expires_at: new Date(Date.now() + 3600000).toISOString()
        }]);

      if (error) throw error;

      setSuccess(`Код сброса отправлен на ${resetEmail}. Код: ${resetCode}`);
      setResetEmail('');
    } catch (error: any) {
      setError('Ошибка отправки кода: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="bg-gray-900 rounded-2xl shadow-2xl p-8 border border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-6">Забыли пароль?</h2>

            {error && (
              <div className="bg-red-500/20 border border-red-500 rounded-lg p-3 mb-4">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {success && (
              <div className="bg-green-500/20 border border-green-500 rounded-lg p-3 mb-4">
                <p className="text-green-400 text-sm">{success}</p>
              </div>
            )}

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#144374] focus:ring-2 focus:ring-[#144374]/20"
                  placeholder="Введите ваш email"
                />
              </div>
            </div>

            <button
              onClick={handleForgotPassword}
              disabled={isLoading || !resetEmail}
              className="w-full bg-[#144374] hover:bg-[#1a5490] text-white py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-4"
            >
              {isLoading ? 'Отправка...' : 'Отправить код'}
            </button>

            <button
              onClick={() => {
                setShowForgotPassword(false);
                setResetEmail('');
                setError('');
                setSuccess('');
              }}
              className="w-full text-gray-400 hover:text-white py-2 text-sm transition-colors"
            >
              Вернуться к входу
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-gray-900 rounded-2xl shadow-2xl p-8 border border-gray-700">
          <div className="flex border-b border-gray-700 mb-6">
            <button
              onClick={() => setIsLoginMode(true)}
              className={`flex-1 py-3 px-4 text-center font-semibold transition-colors ${
                isLoginMode
                  ? 'text-[#144374] border-b-2 border-[#144374]'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              Вход
            </button>
            <button
              onClick={() => setIsLoginMode(false)}
              className={`flex-1 py-3 px-4 text-center font-semibold transition-colors ${
                !isLoginMode
                  ? 'text-[#144374] border-b-2 border-[#144374]'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              Регистрация
            </button>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500 rounded-lg p-3 mb-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-500/20 border border-green-500 rounded-lg p-3 mb-4">
              <p className="text-green-400 text-sm">{success}</p>
            </div>
          )}

          <form onSubmit={isLoginMode ? handleLogin : handleRegister} className="space-y-4">
            {!isLoginMode && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">ФИО</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#144374] focus:ring-2 focus:ring-[#144374]/20"
                      placeholder="Введите ваше ФИО"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Название компании/магазина</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      required
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#144374] focus:ring-2 focus:ring-[#144374]/20"
                      placeholder="Введите название компании/магазина"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Номер телефона</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="tel"
                      required
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#144374] focus:ring-2 focus:ring-[#144374]/20"
                      placeholder="Введите номер телефона"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#144374] focus:ring-2 focus:ring-[#144374]/20"
                  placeholder="Введите ваш email"
                />
              </div>
            </div>

            {!isLoginMode && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Адрес</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    required
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#144374] focus:ring-2 focus:ring-[#144374]/20"
                    placeholder="Введите ваш адрес"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {isLoginMode ? 'Пароль' : 'Придумайте пароль'}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#144374] focus:ring-2 focus:ring-[#144374]/20"
                  placeholder="Введите пароль"
                />
              </div>
            </div>

            {!isLoginMode && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Подтвердите пароль</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#144374] focus:ring-2 focus:ring-[#144374]/20"
                    placeholder="Повторите пароль"
                  />
                </div>
              </div>
            )}

            {isLoginMode && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-[#144374] hover:text-[#1a5490] transition-colors"
                >
                  Забыли пароль?
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-lg font-semibold text-white bg-[#144374] hover:bg-[#1a5490] focus:outline-none focus:ring-2 focus:ring-[#144374]/50 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Загрузка...' : (isLoginMode ? 'Войти' : 'Отправить запрос на регистрацию')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <a href="/" className="text-gray-400 hover:text-white text-sm transition-colors">
              ← Вернуться на главную
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthPage />
  </React.StrictMode>
);
