'use client';

import { useState } from 'react';
import { FaSpinner, FaExclamationTriangle } from 'react-icons/fa';
import { sendMessageWithFallback, OpenRouterMessage } from '@/lib/ai';

// ==================== Tipe Data ====================
type ZakatType = 'fitrah' | 'maal' | 'penghasilan' | 'emas' | 'perdagangan' | 'pertanian' | 'peternakan';
type GoldType = '24k' | '14k';
type FitrahMethod = 'rice' | 'money';
type PreciousType = 'gold' | 'silver';
type AgriIrrigation = 'irrigated' | 'rainfed';
type LivestockType = 'goat' | 'cow';
type IncomeNisabType = 'gold' | 'rice';

// ==================== System Prompt untuk AI ====================
const ZAKAT_SYSTEM_PROMPT = `Anda adalah asisten AI ahli fiqih zakat. Tugas Anda menghitung zakat berdasarkan data yang diberikan pengguna dengan ketentuan syariah berikut:

## KETENTUAN ZAKAT
- **Nisab emas**: 85 gram
- **Nisab perak**: 595 gram
- **Nisab beras (penghasilan & pertanian)**: 520 kg
- **Zakat maal, penghasilan, emas, perdagangan**: 2.5% (0.025)
- **Zakat pertanian irigasi berbayar**: 5% (0.05)
- **Zakat pertanian tadah hujan**: 10% (0.10)
- **Zakat fitrah**: 2,5 kg beras atau uang setara (default Rp 50.000/jiwa, bisa berbeda)
- **Zakat peternakan**:
  - Kambing/domba: nisab 40 ekor, haul 1 tahun. Zakat: 40-120 = 1 ekor, 121-200 = 2 ekor, 201-399 = 3 ekor, 400+ = setiap kelebihan 100 ekor +1 ekor.
  - Sapi: nisab 30 ekor, haul 1 tahun. Zakat: 30-39 = 1 ekor (umur 1 tahun), 40-59 = 1 ekor (umur 2 tahun), 60-69 = 2 ekor (umur 1 tahun), 70-79 = 2 ekor (1 ekor umur 1 thn + 1 ekor umur 2 thn), 80+ = setiap kelebihan 30 ekor +1 ekor.

## FORMAT RESPONS
Berikan hasil perhitungan dalam bahasa Indonesia yang jelas, dengan rincian:
- Nisab yang digunakan
- Apakah wajib zakat atau belum
- Jumlah zakat yang harus dibayar (dalam rupiah untuk zakat mal, atau jumlah hewan/beras untuk zakat fitrah/peternakan/pertanian)
- Catatan perhitungan singkat
Sertakan disclaimer bahwa ini adalah bantuan AI dan sebaiknya dikonfirmasi ke amil zakat.

JANGAN memberikan tautan eksternal. JANGAN menggunakan markdown yang berlebihan.`;

// ==================== Komponen Utama ====================
export default function KalkulatorZakat() {
  // Tab aktif
  const [activeTab, setActiveTab] = useState<ZakatType>('fitrah');
  const [goldType, setGoldType] = useState<GoldType>('14k');

  // Harga acuan
  const [goldPrice24k, setGoldPrice24k] = useState(2916000);
  const [goldPrice14k, setGoldPrice14k] = useState(1078608);
  const [silverPrice, setSilverPrice] = useState(15000);
  const [ricePrice, setRicePrice] = useState(14900);
  const [goatPrice, setGoatPrice] = useState(2000000);
  const [cowPrice, setCowPrice] = useState(15000000);

  // Form data per tab
  const [fitrahPersons, setFitrahPersons] = useState(1);
  const [fitrahMethod, setFitrahMethod] = useState<FitrahMethod>('money');
  const [fitrahRiceKg, setFitrahRiceKg] = useState(2.5);
  const [fitrahMoney, setFitrahMoney] = useState(50000);

  const [maalWealth, setMaalWealth] = useState(0);
  const [maalHaul, setMaalHaul] = useState(false);

  const [incomeMonthly, setIncomeMonthly] = useState(0);
  const [incomeHaul, setIncomeHaul] = useState(false);
  const [incomeNisabType, setIncomeNisabType] = useState<IncomeNisabType>('gold');

  const [preciousType, setPreciousType] = useState<PreciousType>('gold');
  const [preciousWeight, setPreciousWeight] = useState(0);
  const [preciousHaul, setPreciousHaul] = useState(false);

  const [tradeAssets, setTradeAssets] = useState(0);
  const [tradeCash, setTradeCash] = useState(0);
  const [tradeReceivables, setTradeReceivables] = useState(0);
  const [tradeLiabilities, setTradeLiabilities] = useState(0);
  const [tradeHaul, setTradeHaul] = useState(false);

  const [agriHarvest, setAgriHarvest] = useState(0);
  const [agriIrrigation, setAgriIrrigation] = useState<AgriIrrigation>('irrigated');

  const [livestockType, setLivestockType] = useState<LivestockType>('goat');
  const [livestockCount, setLivestockCount] = useState(0);
  const [livestockHaul, setLivestockHaul] = useState(false);

  // State untuk AI
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper format Rupiah
  const formatIDR = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
  };

  // Helper untuk input number
  const handleNumberChange = (setter: (value: number) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '') return setter(0);
    const num = Number(raw);
    if (!isNaN(num) && num >= 0) setter(num);
  };

  // Kirim ke AI
  const calculateWithAI = async () => {
    setAiResult(null);
    setError(null);
    setIsLoading(true);

    const activeGoldPrice = goldType === '24k' ? goldPrice24k : goldPrice14k;
    const baseInfo = `Harga emas ${goldType === '24k' ? '24K' : '14K'}: ${formatIDR(activeGoldPrice)}/gram, perak: ${formatIDR(silverPrice)}/gram, beras: ${formatIDR(ricePrice)}/kg, kambing: ${formatIDR(goatPrice)}/ekor, sapi: ${formatIDR(cowPrice)}/ekor.\n`;

    let userPrompt = '';
    switch (activeTab) {
      case 'fitrah':
        userPrompt = `${baseInfo}Hitung zakat fitrah untuk ${fitrahPersons} jiwa. Metode: ${fitrahMethod === 'rice' ? `beras ${fitrahRiceKg} kg/jiwa` : `uang Rp ${fitrahMoney.toLocaleString('id-ID')}/jiwa`}.`;
        break;
      case 'maal':
        userPrompt = `${baseInfo}Hitung zakat maal dengan total harta Rp ${maalWealth.toLocaleString('id-ID')}. Haul: ${maalHaul ? 'sudah 1 tahun' : 'belum 1 tahun'}.`;
        break;
      case 'penghasilan':
        userPrompt = `${baseInfo}Hitung zakat penghasilan dengan pendapatan Rp ${incomeMonthly.toLocaleString('id-ID')}/bulan. Haul: ${incomeHaul ? 'sudah 1 tahun' : 'belum 1 tahun'}. Acuan nisab: ${incomeNisabType === 'gold' ? 'emas 85 gram' : 'beras 520 kg'}.`;
        break;
      case 'emas':
        userPrompt = `${baseInfo}Hitung zakat ${preciousType === 'gold' ? 'emas' : 'perak'} dengan berat ${preciousWeight} gram. Haul: ${preciousHaul ? 'sudah 1 tahun' : 'belum 1 tahun'}.`;
        break;
      case 'perdagangan':
        userPrompt = `${baseInfo}Hitung zakat perdagangan. Aset: ${formatIDR(tradeAssets)}, kas: ${formatIDR(tradeCash)}, piutang: ${formatIDR(tradeReceivables)}, hutang: ${formatIDR(tradeLiabilities)}. Haul: ${tradeHaul ? 'sudah 1 tahun' : 'belum 1 tahun'}.`;
        break;
      case 'pertanian':
        userPrompt = `${baseInfo}Hitung zakat pertanian dengan hasil panen ${agriHarvest} kg. Irigasi: ${agriIrrigation === 'irrigated' ? 'berbayar (5%)' : 'tadah hujan (10%)'}.`;
        break;
      case 'peternakan':
        userPrompt = `${baseInfo}Hitung zakat peternakan ${livestockType === 'goat' ? 'kambing/domba' : 'sapi'} dengan jumlah ${livestockCount} ekor. Haul: ${livestockHaul ? 'sudah 1 tahun' : 'belum 1 tahun'}.`;
        break;
    }

    const messages: OpenRouterMessage[] = [
      { role: 'system', content: ZAKAT_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ];

    try {
      const response = await sendMessageWithFallback(messages, true);
      setAiResult(response.content);
    } catch (err) {
      console.error(err);
      setError('Gagal menghitung zakat. Silakan coba lagi nanti.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-emerald-800">Kalkulator Zakat 2026</h1>
          <p className="text-emerald-600 mt-2">Dihitung oleh Quranku AI</p>
        </div>

        {/* Panel Harga Acuan */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-emerald-100">
          <h2 className="font-semibold text-lg text-emerald-800 mb-4">Harga Acuan (dapat diubah)</h2>
          <div className="mb-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-sm font-medium text-amber-800 mb-2">Acuan Nisab:</p>
            <div className="flex gap-4">
              <label className="flex items-center"><input type="radio" value="24k" checked={goldType === '24k'} onChange={() => setGoldType('24k')} className="mr-2" /> Emas 24K</label>
              <label className="flex items-center"><input type="radio" value="14k" checked={goldType === '14k'} onChange={() => setGoldType('14k')} className="mr-2" /> Emas 14K (BAZNAS)</label>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Emas 24K/gram (Rp)</label><input type="number" min="0" value={goldPrice24k} onChange={handleNumberChange(setGoldPrice24k)} className="w-full px-4 py-2 border rounded-lg" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Emas 14K/gram (Rp)</label><input type="number" min="0" value={goldPrice14k} onChange={handleNumberChange(setGoldPrice14k)} className="w-full px-4 py-2 border rounded-lg" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Perak/gram (Rp)</label><input type="number" min="0" value={silverPrice} onChange={handleNumberChange(setSilverPrice)} className="w-full px-4 py-2 border rounded-lg" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Beras/kg (Rp)</label><input type="number" min="0" value={ricePrice} onChange={handleNumberChange(setRicePrice)} className="w-full px-4 py-2 border rounded-lg" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Kambing (Rp)</label><input type="number" min="0" value={goatPrice} onChange={handleNumberChange(setGoatPrice)} className="w-full px-4 py-2 border rounded-lg" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Sapi (Rp)</label><input type="number" min="0" value={cowPrice} onChange={handleNumberChange(setCowPrice)} className="w-full px-4 py-2 border rounded-lg" /></div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {(['fitrah', 'maal', 'penghasilan', 'emas', 'perdagangan', 'pertanian', 'peternakan'] as ZakatType[]).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-lg font-medium capitalize transition ${activeTab === tab ? 'bg-emerald-600 text-white shadow-md' : 'bg-white text-gray-700 hover:bg-emerald-50 border border-gray-200'}`}>
              {tab === 'fitrah' && 'Fitrah'}{tab === 'maal' && 'Maal'}{tab === 'penghasilan' && 'Penghasilan'}{tab === 'emas' && 'Emas/Perak'}{tab === 'perdagangan' && 'Perdagangan'}{tab === 'pertanian' && 'Pertanian'}{tab === 'peternakan' && 'Peternakan'}
            </button>
          ))}
        </div>

        {/* Form Input */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-emerald-100">
          {activeTab === 'fitrah' && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-emerald-800">Zakat Fitrah</h3>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Jumlah Jiwa</label><input type="number" min="1" value={fitrahPersons} onChange={(e) => setFitrahPersons(Math.max(1, Number(e.target.value)))} className="w-full px-4 py-2 border rounded-lg" /></div>
              <div className="flex gap-4"><label><input type="radio" value="money" checked={fitrahMethod === 'money'} onChange={() => setFitrahMethod('money')} className="mr-2" /> Uang</label><label><input type="radio" value="rice" checked={fitrahMethod === 'rice'} onChange={() => setFitrahMethod('rice')} className="mr-2" /> Beras</label></div>
              {fitrahMethod === 'rice' ? <div><label className="block text-sm font-medium text-gray-700 mb-1">Beras per jiwa (kg)</label><input type="number" step="0.1" min="0" value={fitrahRiceKg} onChange={(e) => setFitrahRiceKg(Math.max(0, Number(e.target.value)))} className="w-full px-4 py-2 border rounded-lg" /></div> : <div><label className="block text-sm font-medium text-gray-700 mb-1">Nilai uang per jiwa (Rp)</label><input type="number" min="0" value={fitrahMoney} onChange={(e) => setFitrahMoney(Math.max(0, Number(e.target.value)))} className="w-full px-4 py-2 border rounded-lg" /></div>}
            </div>
          )}
          {activeTab === 'maal' && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-emerald-800">Zakat Maal</h3>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Total Harta (Rp)</label><input type="number" min="0" value={maalWealth} onChange={handleNumberChange(setMaalWealth)} className="w-full px-4 py-2 border rounded-lg" /></div>
              <label className="flex items-center"><input type="checkbox" checked={maalHaul} onChange={(e) => setMaalHaul(e.target.checked)} className="mr-2" /> Sudah mencapai haul (1 tahun)</label>
            </div>
          )}
          {activeTab === 'penghasilan' && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-emerald-800">Zakat Penghasilan</h3>
              <div className="p-3 bg-blue-50 rounded-lg"><p className="text-sm font-medium text-blue-800 mb-2">Acuan Nisab:</p><div className="flex gap-4"><label><input type="radio" value="gold" checked={incomeNisabType === 'gold'} onChange={() => setIncomeNisabType('gold')} className="mr-2" /> Emas 85 gram</label><label><input type="radio" value="rice" checked={incomeNisabType === 'rice'} onChange={() => setIncomeNisabType('rice')} className="mr-2" /> Beras 520 kg</label></div></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Penghasilan per bulan (Rp)</label><input type="number" min="0" value={incomeMonthly} onChange={handleNumberChange(setIncomeMonthly)} className="w-full px-4 py-2 border rounded-lg" /></div>
              <label className="flex items-center"><input type="checkbox" checked={incomeHaul} onChange={(e) => setIncomeHaul(e.target.checked)} className="mr-2" /> Sudah mencapai haul (1 tahun)</label>
            </div>
          )}
          {activeTab === 'emas' && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-emerald-800">Zakat Emas/Perak</h3>
              <div className="flex gap-4"><label><input type="radio" value="gold" checked={preciousType === 'gold'} onChange={() => setPreciousType('gold')} className="mr-2" /> Emas</label><label><input type="radio" value="silver" checked={preciousType === 'silver'} onChange={() => setPreciousType('silver')} className="mr-2" /> Perak</label></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Berat (gram)</label><input type="number" step="0.01" min="0" value={preciousWeight} onChange={handleNumberChange(setPreciousWeight)} className="w-full px-4 py-2 border rounded-lg" /></div>
              <label className="flex items-center"><input type="checkbox" checked={preciousHaul} onChange={(e) => setPreciousHaul(e.target.checked)} className="mr-2" /> Sudah mencapai haul (1 tahun)</label>
            </div>
          )}
          {activeTab === 'perdagangan' && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-emerald-800">Zakat Perdagangan</h3>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Nilai barang dagangan (Rp)</label><input type="number" min="0" value={tradeAssets} onChange={handleNumberChange(setTradeAssets)} className="w-full px-4 py-2 border rounded-lg" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Uang tunai terkait (Rp)</label><input type="number" min="0" value={tradeCash} onChange={handleNumberChange(setTradeCash)} className="w-full px-4 py-2 border rounded-lg" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Piutang (Rp)</label><input type="number" min="0" value={tradeReceivables} onChange={handleNumberChange(setTradeReceivables)} className="w-full px-4 py-2 border rounded-lg" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Hutang (Rp)</label><input type="number" min="0" value={tradeLiabilities} onChange={handleNumberChange(setTradeLiabilities)} className="w-full px-4 py-2 border rounded-lg" /></div>
              <label className="flex items-center"><input type="checkbox" checked={tradeHaul} onChange={(e) => setTradeHaul(e.target.checked)} className="mr-2" /> Sudah mencapai haul (1 tahun)</label>
            </div>
          )}
          {activeTab === 'pertanian' && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-emerald-800">Zakat Pertanian</h3>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Hasil panen (kg)</label><input type="number" min="0" value={agriHarvest} onChange={handleNumberChange(setAgriHarvest)} className="w-full px-4 py-2 border rounded-lg" /></div>
              <div className="flex gap-4"><label><input type="radio" value="irrigated" checked={agriIrrigation === 'irrigated'} onChange={() => setAgriIrrigation('irrigated')} className="mr-2" /> Irigasi berbayar (5%)</label><label><input type="radio" value="rainfed" checked={agriIrrigation === 'rainfed'} onChange={() => setAgriIrrigation('rainfed')} className="mr-2" /> Tadah hujan (10%)</label></div>
            </div>
          )}
          {activeTab === 'peternakan' && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-emerald-800">Zakat Peternakan</h3>
              <div className="flex gap-4"><label><input type="radio" value="goat" checked={livestockType === 'goat'} onChange={() => setLivestockType('goat')} className="mr-2" /> Kambing/Domba</label><label><input type="radio" value="cow" checked={livestockType === 'cow'} onChange={() => setLivestockType('cow')} className="mr-2" /> Sapi</label></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Jumlah ekor</label><input type="number" min="0" value={livestockCount} onChange={handleNumberChange(setLivestockCount)} className="w-full px-4 py-2 border rounded-lg" /></div>
              <label className="flex items-center"><input type="checkbox" checked={livestockHaul} onChange={(e) => setLivestockHaul(e.target.checked)} className="mr-2" /> Sudah mencapai haul (1 tahun)</label>
            </div>
          )}

          <div className="mt-6">
            <button onClick={calculateWithAI} disabled={isLoading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-lg transition shadow-md disabled:opacity-50 flex items-center justify-center gap-2">
              {isLoading ? <><FaSpinner className="animate-spin" /> Menghitung dengan AI...</> : 'Hitung Zakat dengan AI'}
            </button>
          </div>

          {/* Hasil AI */}
          {isLoading && (
            <div className="mt-6 p-5 bg-emerald-50 rounded-lg border border-emerald-200">
              <div className="flex items-center justify-center gap-2 text-emerald-700"><FaSpinner className="animate-spin" /> AI sedang memproses...</div>
            </div>
          )}
          {aiResult && !isLoading && (
            <div className="mt-6 p-5 bg-emerald-50 rounded-lg border border-emerald-200">
              <div className="text-gray-800 whitespace-pre-wrap">{aiResult}</div>
              <div className="mt-4 flex items-start gap-2 text-xs text-amber-600 bg-amber-50 p-2 rounded-lg">
                <FaExclamationTriangle className="w-4 h-4 mt-0.5" />
                <span>Hasil ini dihasilkan oleh AI dan bersifat informatif. Konsultasikan dengan amil zakat terpercaya.</span>
              </div>
            </div>
          )}
          {error && !isLoading && <div className="mt-6 p-5 bg-red-50 rounded-lg border border-red-200 text-red-700">{error}</div>}
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Kalkulator ini menggunakan Quranku AI untuk menghitung zakat. Pastikan data yang dimasukkan akurat.</p>
        </div>
      </div>
    </div>
  );
}