"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import {
  FiGrid,
  FiList,
  FiCopy,
  FiTrash2,
  FiCheck,
  FiKey,
  FiLink,
  FiPlus,
  FiSearch,
  FiLock,
  FiUnlock,
  FiMail,
  FiCalendar
} from "react-icons/fi";
import AdminContainer from "@/app/components/admin/AdminContainer";

interface RegisterToken {
  id: number;
  token: string;
  email: string;
  used: boolean;
  used_at: string | null;
  created_by: number | null;
  created_at: string;
}

export default function RegisterTokensPage() {
  const { user, isLoading: isLoadingAuth } = useAuth();
  const router = useRouter();

  const userRole = user?.role || (user?.is_admin ? "admin" : "viewer");
  const hasAccess = userRole === "admin";

  const [tokens, setTokens] = useState<RegisterToken[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [isLoading, setIsLoading] = useState(true);
  const [newEmail, setNewEmail] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoadingAuth && !hasAccess && user) {
      router.push("/admin");
    }
  }, [hasAccess, isLoadingAuth, router, user]);

  const baseUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return window.location.origin;
  }, []);

  const fetchTokens = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const authToken = Cookies.get("authToken");

      if (!authToken) {
        setError("Oturum bulunamadı. Lütfen tekrar giriş yapın.");
        setTokens([]);
        return;
      }

      const response = await fetch("/api/admin/register-tokens", {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Token'lar yüklenirken hata oluştu");
      }

      setTokens(result.tokens || []);
    } catch (err: any) {
      console.error("Error fetching tokens:", err);
      setError("Token'lar yüklenirken hata oluştu");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (hasAccess) {
      fetchTokens();
    }
  }, [hasAccess]);

  const tokenStats = useMemo(() => {
    const total = tokens.length;
    const active = tokens.filter((token) => !token.used).length;
    const used = total - active;
    return { total, active, used };
  }, [tokens]);

  const generateToken = () => {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  };

  const handleCreateToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newEmail.includes("@")) {
      setError("Geçerli bir e-posta adresi girin.");
      return;
    }

    try {
      setIsCreating(true);
      setError(null);
      setSuccess(null);

      const token = generateToken();
      const authToken = Cookies.get("authToken");

      if (!authToken) {
        setError("Oturum bulunamadı. Lütfen tekrar giriş yapın.");
        setIsCreating(false);
        return;
      }

      const response = await fetch("/api/admin/register-tokens", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          email: newEmail,
          token: token,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Token oluşturulurken hata oluştu");
      }

      setSuccess("Kayıt linki oluşturuldu! Sistemden kopyalayarak paylaşabilirsiniz.");
      setNewEmail("");
      await fetchTokens();
      
      // Auto dismiss success
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      console.error("Error creating token:", err);
      setError(err.message || "Token oluşturulurken hata oluştu");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteToken = async (id: number) => {
    if (!confirm("Bu dijital anahtarı sistemden tamamen silmek istediğinize emin misiniz?")) {
      return;
    }

    try {
      const authToken = Cookies.get("authToken");

      if (!authToken) {
        setError("Oturum bulunamadı. Lütfen tekrar giriş yapın.");
        return;
      }

      const response = await fetch(`/api/admin/register-tokens/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Token silinirken hata oluştu");
      }

      setSuccess("Kayıt anahtarı başarıyla imha edildi.");
      setTimeout(() => setSuccess(null), 3000);
      await fetchTokens();
    } catch (err: any) {
      console.error("Error deleting token:", err);
      setError(err.message || "Token silinirken hata oluştu");
    }
  };

  const copyToClipboard = (tokenValue: string, tokenId: number) => {
    const fullUrl = `${baseUrl}/register?token=${tokenValue}`;
    navigator.clipboard.writeText(fullUrl).then(() => {
      setCopiedToken(tokenId.toString());
      setTimeout(() => setCopiedToken(null), 2000);
    });
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "Bilinmiyor";
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("tr-TR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const filteredTokens = tokens.filter((token) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (token.email && token.email.toLowerCase().includes(searchLower)) ||
      (token.token && token.token.toLowerCase().includes(searchLower))
    );
  });

  if (isLoadingAuth) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-100px)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!hasAccess) return null;

  return (
    <AdminContainer>
      <div className="max-w-7xl mx-auto px-4 py-8 animate-in fade-in duration-500 text-gray-900 dark:text-gray-100 min-h-screen">
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Erişim Anahtarları</h1>
            <p className="text-gray-500 dark:text-gray-400 font-medium mt-1">
              Platforma yetkili giriş kapıları oluşturun ve davet edilen üyeleri izleyin.
            </p>
          </div>
        </div>

        {/* Form Creation Box */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 mb-8">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <FiPlus className="text-purple-600" /> Yeni Davet Linki Oluştur
          </h2>
          <form onSubmit={handleCreateToken} className="flex flex-col md:flex-row gap-4">
             <div className="relative flex-1">
                <input
                  id="email"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="musteri@ornek.com"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-colors"
                />
                <FiMail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
             </div>
             <button
               type="submit"
               disabled={isCreating}
               className="inline-flex shrink-0 items-center justify-center gap-2 px-8 py-3 font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-sm transition-all disabled:opacity-50"
             >
               {isCreating ? "Derleniyor..." : "Bağlantı Oluştur"}
             </button>
          </form>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 flex items-center gap-1.5">
             <FiLock className="text-purple-600/70" /> Anahtarlar yalnızca atanan e-posta adresiyle birleştirilir ve tescilden sonra kendini imha eder.
          </p>

          {error && (
            <div className="mt-4 p-4 text-sm font-bold bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 flex items-center justify-between">
              {error}
              <button onClick={() => setError(null)}><FiTrash2/></button>
            </div>
          )}

          {success && (
            <div className="mt-4 p-4 text-sm font-bold bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl text-green-600 dark:text-green-400 flex items-center justify-between">
              {success}
              <button onClick={() => setSuccess(null)}><FiTrash2/></button>
            </div>
          )}
        </div>

        {/* Dashboard Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-5 hover:border-purple-200 dark:hover:border-purple-800/50 transition-colors">
            <div className="p-4 bg-purple-50 dark:bg-purple-900/30 rounded-xl text-purple-600 dark:text-purple-400">
              <FiLink size={24} />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
                Yayındaki Anahtarlar
              </p>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                {tokenStats.total}
              </h3>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-5 hover:border-purple-200 dark:hover:border-purple-800/50 transition-colors">
            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl text-emerald-600 dark:text-emerald-400">
              <FiUnlock size={24} />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
                Kullanıma Hazır
              </p>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                {tokenStats.active}
              </h3>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-5 hover:border-purple-200 dark:hover:border-purple-800/50 transition-colors">
            <div className="p-4 bg-red-50 dark:bg-red-900/30 rounded-xl text-red-600 dark:text-red-400">
              <FiLock size={24} />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
                Tüketilen / Kilitli
              </p>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                {tokenStats.used}
              </h3>
            </div>
          </div>
        </div>

        {/* Global Toolbar */}
        <div className="mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="relative w-full md:max-w-md shrink-0">
            <input
              type="text"
              placeholder="E-posta veya anahtar kodu ile ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-colors placeholder:text-gray-400"
            />
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>

          <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
            <button
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-all ${
                viewMode === "grid" ? "bg-white dark:bg-gray-700 text-purple-600 shadow-sm" : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              <FiGrid /> Kart
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-all ${
                viewMode === "list" ? "bg-white dark:bg-gray-700 text-purple-600 shadow-sm" : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              <FiList /> Liste
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600"></div>
          </div>
        ) : filteredTokens.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-dashed border-gray-300 dark:border-gray-800 py-24 text-center">
             <FiKey className="mx-auto h-12 w-12 text-gray-400 mb-4" />
             <h3 className="text-lg font-bold text-gray-900 dark:text-white">Hiç anahtar bulunamadı.</h3>
             <p className="mt-2 text-gray-500 dark:text-gray-400 font-medium">Burası biraz fazla güvenli görünüyor; üstteki modülü kullanarak birini davet edin.</p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTokens.map((token) => (
              <div key={token.id} className="group bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md hover:border-purple-200 dark:hover:border-purple-800/50 transition-all duration-300 overflow-hidden flex flex-col">
                <div className="p-6 flex-1 flex flex-col">
                  
                  <div className="flex justify-between items-start mb-5">
                    {token.used ? (
                       <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg shadow-sm bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400 border border-red-200 dark:border-red-800">Tüketildi</span>
                    ) : (
                       <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg shadow-sm bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">Kullanıma Hazır</span>
                    )}
                    <button 
                      onClick={() => copyToClipboard(token.token, token.id)}
                      className="text-xs font-bold text-purple-600 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-400 px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-purple-100 transition-colors"
                    >
                      {copiedToken === token.id.toString() ? (
                        <><FiCheck /> Kopyalandı</>
                      ) : (
                        <><FiCopy /> URL'yi Al</>
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-4 mb-5">
                    <div className="w-12 h-12 rounded-xl border border-purple-100 dark:border-purple-900 bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                       <FiKey className="w-6 h-6 text-purple-600/70" />
                    </div>
                    <div className="truncate">
                       <h3 className="text-sm font-black tracking-tight text-gray-900 dark:text-white leading-tight truncate">
                         {token.email}
                       </h3>
                       <span className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                          ID: #{token.id}
                       </span>
                    </div>
                  </div>

                  <div className="mt-2 space-y-0 text-xs font-mono text-gray-500 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-100 dark:border-gray-800 truncate">
                      {token.token}
                  </div>

                  <div className="mt-5 space-y-2 flex-1">
                     <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                        <FiCalendar className="w-3.5 h-3.5" /> <strong>Temin Edildi:</strong> {formatDate(token.created_at)}
                     </div>
                     {token.used && (
                       <div className="flex items-center gap-1.5 text-xs text-red-500 dark:text-red-400">
                          <FiLock className="w-3.5 h-3.5" /> <strong>Kilitlendi:</strong> {formatDate(token.used_at || "")}
                       </div>
                     )}
                  </div>

                  <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-end">
                     <button onClick={() => handleDeleteToken(token.id)} className="flex items-center justify-center gap-1.5 p-2 px-3 text-xs font-bold text-red-500 hover:text-white hover:bg-red-600 rounded-lg transition-colors" title="İptal Et">
                       <FiTrash2 className="w-4 h-4" /> Kalıcı Olarak Sil
                     </button>
                  </div>

                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    <th className="px-6 py-4 font-bold tracking-wider">Tanımlı E-posta</th>
                    <th className="px-6 py-4 font-bold tracking-wider">Durum</th>
                    <th className="px-6 py-4 font-bold tracking-wider">Transfer URL</th>
                    <th className="px-6 py-4 font-bold tracking-wider">Bağlantı Tarihleri</th>
                    <th className="px-6 py-4 font-bold tracking-wider text-right">Müdahale</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredTokens.map((token) => (
                    <tr key={token.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                      <td className="px-6 py-4">
                         <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-lg border border-purple-100 dark:border-purple-900 bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                               <FiKey className="w-4 h-4 text-purple-600/70" />
                           </div>
                           <div className="font-bold text-gray-900 dark:text-white">
                             {token.email}
                             <div className="text-[10px] text-gray-400 font-medium">SYS_ID: #{token.id}</div>
                           </div>
                         </div>
                      </td>
                      <td className="px-6 py-4">
                        {token.used ? (
                           <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg shadow-sm bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400 border border-red-200 dark:border-red-800">Tüketildi</span>
                        ) : (
                           <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg shadow-sm bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">Kullanıma Hazır</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                         <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                               ...{token.token.slice(-6)}
                            </span>
                            <button 
                              onClick={() => copyToClipboard(token.token, token.id)}
                              className="w-7 h-7 flex items-center justify-center bg-gray-100 dark:bg-gray-800 hover:bg-purple-100 dark:hover:bg-purple-900/40 hover:text-purple-600 rounded text-gray-400 transition-colors"
                            >
                              {copiedToken === token.id.toString() ? <FiCheck className="text-green-500" /> : <FiCopy />}
                            </button>
                         </div>
                      </td>
                      <td className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 space-y-1">
                         <div className="flex items-center gap-1"><FiCalendar /> Üretim: {formatDate(token.created_at)}</div>
                         {token.used && <div className="flex items-center gap-1 text-red-400 dark:text-red-500"><FiLock /> Kilit: {formatDate(token.used_at || "")}</div>}
                      </td>
                      <td className="px-6 py-4 text-right">
                         <button onClick={() => handleDeleteToken(token.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                           <FiTrash2 className="w-4 h-4" />
                         </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminContainer>
  );
}
