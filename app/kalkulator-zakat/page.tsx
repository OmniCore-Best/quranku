'use client';

import { useState, useEffect, useMemo } from 'react';

// Tipe data untuk setiap jenis zakat
type ZakatType = 'fitrah' | 'maal' | 'penghasilan' | 'emas' | 'perdagangan' | 'pertanian' | 'peternakan';
type GoldType = '24k' | '14k';
type FitrahMethod = 'rice' | 'money';
type PreciousType = 'gold' | 'silver';
type AgriIrrigation = 'irrigated' | 'rainfed';
type LivestockType = 'goat' | 'cow';
type IncomeNisabType = 'gold' | 'rice'; // Opsi nisab untuk zakat penghasilan

// ==================== KONSTANTA SYARIAH ====================
// Nisab
const NISAB_GOLD_GRAM = 85;           
const NISAB_SILVER_GRAM = 595;        
const NISAB_RICE_KG_INCOME = 520;     // Nisab beras untuk zakat penghasilan (520 kg)
const NISAB_RICE_KG_AGRICULTURE = 520; // Nisab beras untuk zakat pertanian (520 kg)
const NISAB_GABAH_KG_AGRICULTURE = 653; // Nisab gabah untuk zakat pertanian (653 kg) - Sebagai informasi
const ZAKAT_RATE = 0.025;             // 2.5%

// Tarif zakat pertanian
const AGRICULTURE_RATE_IRRIGATED = 0.05;   // 5% jika pakai irigasi
const AGRICULTURE_RATE_RAINFED = 0.10;     // 10% jika tadah hujan

// Harga default berdasarkan data terkini (per 19 Februari 2026)
const DEFAULT_GOLD_PRICE_24K = 2916000;     // Rp 2.916.000 per gram (24 karat)
const DEFAULT_GOLD_PRICE_14K = 1078608;     // Rp 1.078.608 per gram (14 karat, sesuai rujukan BAZNAS)[reference:0]
const DEFAULT_SILVER_PRICE = 15000;         // Rp 15.000 per gram (estimasi)
const DEFAULT_RICE_PRICE = 14900;           // Rp 14.900 per kg
const DEFAULT_FITRAH_AMOUNT = 50000;        // Rp 50.000 per jiwa[reference:1]
const DEFAULT_GOAT_PRICE = 2000000;         // Rp 2.000.000 per ekor kambing
const DEFAULT_COW_PRICE = 15000000;         // Rp 15.000.000 per ekor sapi

// ==================== FUNGSI PEMBANTU ====================

// Fungsi untuk menghitung zakat peternakan
interface LivestockZakatResult {
  amount: number;        // jumlah hewan yang harus dikeluarkan
  description: string;   // deskripsi dalam bahasa Indonesia
}

function calculateLivestockZakat(type: LivestockType, count: number): LivestockZakatResult {
  if (type === 'goat') {
    // Kambing/domba
    if (count < 40) {
      return { amount: 0, description: 'Belum mencapai nisab (40 ekor)' };
    }
    if (count <= 120) {
      return { amount: 1, description: '1 ekor kambing/domba (umur 2 tahun)' };
    }
    if (count <= 200) {
      return { amount: 2, description: '2 ekor kambing/domba (umur 2 tahun)' };
    }
    if (count <= 399) {
      return { amount: 3, description: '3 ekor kambing/domba (umur 2 tahun)' };
    }
    // Setiap kelebihan 100 ekor dari 400, tambah 1 ekor
    const extra = Math.floor((count - 400) / 100) + 1;
    const total = 3 + extra;
    return { amount: total, description: `${total} ekor kambing/domba (umur 2 tahun)` };
  } else {
    // Sapi
    if (count < 30) {
      return { amount: 0, description: 'Belum mencapai nisab (30 ekor)' };
    }
    if (count <= 39) {
      return { amount: 1, description: '1 ekor sapi (umur 1 tahun)' };
    }
    if (count <= 59) {
      return { amount: 1, description: '1 ekor sapi (umur 2 tahun)' };
    }
    if (count <= 69) {
      return { amount: 2, description: '2 ekor sapi (umur 1 tahun)' };
    }
    if (count <= 79) {
      return { amount: 2, description: '2 ekor sapi (1 ekor umur 1 thn, 1 ekor umur 2 thn)' };
    }
    // Setiap kelebihan 30 ekor dari 80, tambah 1 ekor
    const extra = Math.floor((count - 80) / 30) + 1;
    const total = 2 + extra;
    return { amount: total, description: `${total} ekor sapi (kombinasi umur sesuai ketentuan)` };
  }
}

export default function KalkulatorZakat() {
  // State untuk tab aktif dan jenis emas acuan nisab
  const [activeTab, setActiveTab] = useState<ZakatType>('fitrah');
  const [goldType, setGoldType] = useState<GoldType>('14k'); // Default ke 14k sesuai standar BAZNAS 2026[reference:2]

  // State untuk harga acuan
  const [goldPrice24k, setGoldPrice24k] = useState(DEFAULT_GOLD_PRICE_24K);
  const [goldPrice14k, setGoldPrice14k] = useState(DEFAULT_GOLD_PRICE_14K);
  const [silverPrice, setSilverPrice] = useState(DEFAULT_SILVER_PRICE);
  const [ricePrice, setRicePrice] = useState(DEFAULT_RICE_PRICE);
  const [goatPrice, setGoatPrice] = useState(DEFAULT_GOAT_PRICE);
  const [cowPrice, setCowPrice] = useState(DEFAULT_COW_PRICE);

  // State untuk formulir
  // Zakat Fitrah
  const [fitrahPersons, setFitrahPersons] = useState(1);
  const [fitrahMethod, setFitrahMethod] = useState<FitrahMethod>('money');
  const [fitrahRiceKg, setFitrahRiceKg] = useState(2.5);
  const [fitrahMoney, setFitrahMoney] = useState(DEFAULT_FITRAH_AMOUNT);

  // Zakat Maal
  const [maalWealth, setMaalWealth] = useState(0);
  const [maalHaul, setMaalHaul] = useState(false);

  // Zakat Penghasilan
  const [incomeMonthly, setIncomeMonthly] = useState(0);
  const [incomeHaul, setIncomeHaul] = useState(false);
  const [incomeNisabType, setIncomeNisabType] = useState<IncomeNisabType>('gold');

  // Zakat Emas/Perak
  const [preciousType, setPreciousType] = useState<PreciousType>('gold');
  const [preciousWeight, setPreciousWeight] = useState(0);
  const [preciousHaul, setPreciousHaul] = useState(false);

  // Zakat Perdagangan
  const [tradeAssets, setTradeAssets] = useState(0);
  const [tradeCash, setTradeCash] = useState(0);
  const [tradeReceivables, setTradeReceivables] = useState(0);
  const [tradeLiabilities, setTradeLiabilities] = useState(0);
  const [tradeHaul, setTradeHaul] = useState(false);

  // Zakat Pertanian
  const [agriHarvest, setAgriHarvest] = useState(0);
  const [agriIrrigation, setAgriIrrigation] = useState<AgriIrrigation>('irrigated');

  // Zakat Peternakan
  const [livestockType, setLivestockType] = useState<LivestockType>('goat');
  const [livestockCount, setLivestockCount] = useState(0);
  const [livestockHaul, setLivestockHaul] = useState(false);

  // Hasil perhitungan
  const [result, setResult] = useState<number | null>(null);
  const [nisabInfo, setNisabInfo] = useState<string>('');
  const [livestockDetail, setLivestockDetail] = useState<string>('');
  const [calculationNote, setCalculationNote] = useState<string>('');

  // Harga emas aktif berdasarkan pilihan
  const activeGoldPrice = useMemo(() => {
    return goldType === '24k' ? goldPrice24k : goldPrice14k;
  }, [goldType, goldPrice24k, goldPrice14k]);

  // Fungsi untuk memformat mata uang Rupiah
  const formatIDR = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Fungsi untuk membulatkan hasil zakat ke bawah ke ribuan terdekat
  const roundDownToThousand = (value: number): number => {
    return Math.floor(value / 1000) * 1000;
  };

  // Fungsi utama perhitungan zakat
  const calculateZakat = () => {
    setResult(null);
    setNisabInfo('');
    setLivestockDetail('');
    setCalculationNote('');
    
    // Nilai nisab berdasarkan emas yang dipilih (untuk maal, perdagangan)
    const goldNisabValue = NISAB_GOLD_GRAM * activeGoldPrice;

    switch (activeTab) {
      case 'fitrah': {
        let total = 0;
        let note = `Zakat Fitrah untuk ${fitrahPersons} jiwa. `;
        
        if (fitrahMethod === 'rice') {
          const riceValue = fitrahPersons * fitrahRiceKg * ricePrice;
          total = riceValue;
          note += `Beras ${fitrahRiceKg} kg/jiwa × harga beras Rp ${ricePrice.toLocaleString('id-ID')}/kg.`;
        } else {
          total = fitrahPersons * fitrahMoney;
          note += `Uang Rp ${fitrahMoney.toLocaleString('id-ID')}/jiwa.`;
        }
        
        const roundedTotal = roundDownToThousand(total);
        setResult(roundedTotal);
        setNisabInfo(`✅ Wajib zakat fitrah untuk setiap jiwa.`);
        setCalculationNote(note);
        break;
      }

      case 'maal': {
        const roundedNisab = roundDownToThousand(goldNisabValue);
        let total = 0;
        let note = '';
        
        if (maalWealth >= goldNisabValue && maalHaul) {
          total = maalWealth * ZAKAT_RATE;
          note = `Harta Rp ${maalWealth.toLocaleString('id-ID')} mencapai nisab (${formatIDR(roundedNisab)}) dan haul. Zakat = 2.5% × harta.`;
        } else {
          note = maalHaul 
            ? `Harta Rp ${maalWealth.toLocaleString('id-ID')} di bawah nisab (${formatIDR(roundedNisab)}).` 
            : 'Syarat haul (1 tahun) belum terpenuhi.';
        }
        
        setResult(roundDownToThousand(total));
        setNisabInfo(`Nisab: ${formatIDR(roundedNisab)} (${goldType === '24k' ? 'emas 24K' : 'emas 14K'} ${NISAB_GOLD_GRAM} gram)`);
        setCalculationNote(note);
        break;
      }

      case 'penghasilan': {
        let nisabValue = 0;
        let nisabDesc = '';
        let note = '';
        
        if (incomeNisabType === 'gold') {
          nisabValue = goldNisabValue;
          nisabDesc = `Nisab: ${formatIDR(roundDownToThousand(nisabValue))} (${goldType === '24k' ? 'emas 24K' : 'emas 14K'} ${NISAB_GOLD_GRAM} gram)`;
        } else {
          nisabValue = NISAB_RICE_KG_INCOME * ricePrice;
          nisabDesc = `Nisab: ${formatIDR(roundDownToThousand(nisabValue))} (setara ${NISAB_RICE_KG_INCOME} kg beras × Rp ${ricePrice.toLocaleString('id-ID')}/kg)`;
        }

        const annualIncome = incomeMonthly * 12;
        let total = 0;
        
        if (annualIncome >= nisabValue && incomeHaul) {
          total = annualIncome * ZAKAT_RATE;
          note = `Penghasilan tahunan Rp ${annualIncome.toLocaleString('id-ID')} mencapai nisab dan haul. Zakat = 2.5% × penghasilan tahunan.`;
        } else {
          note = incomeHaul 
            ? `Penghasilan tahunan Rp ${annualIncome.toLocaleString('id-ID')} di bawah nisab.` 
            : 'Syarat haul (1 tahun) belum terpenuhi.';
        }
        
        setResult(roundDownToThousand(total));
        setNisabInfo(nisabDesc);
        setCalculationNote(note);
        break;
      }

      case 'emas': {
        const nisabGram = preciousType === 'gold' ? NISAB_GOLD_GRAM : NISAB_SILVER_GRAM;
        const pricePerGram = preciousType === 'gold' ? activeGoldPrice : silverPrice;
        const value = preciousWeight * pricePerGram;
        const nisabValue = nisabGram * pricePerGram;
        
        let total = 0;
        let note = '';
        
        if (preciousWeight >= nisabGram && preciousHaul) {
          total = value * ZAKAT_RATE;
          note = `Berat ${preciousWeight} gram mencapai nisab (${nisabGram} gram) dan haul. Zakat = 2.5% × nilai emas/perak.`;
        } else {
          note = preciousHaul 
            ? `Berat ${preciousWeight} gram di bawah nisab (${nisabGram} gram).` 
            : 'Syarat haul (1 tahun) belum terpenuhi.';
        }
        
        setResult(roundDownToThousand(total));
        setNisabInfo(`Nisab: ${nisabGram} gram, nilai nisab ${formatIDR(roundDownToThousand(nisabValue))} (harga Rp ${pricePerGram.toLocaleString('id-ID')}/gram)`);
        setCalculationNote(note);
        break;
      }

      case 'perdagangan': {
        const netWorth = tradeAssets + tradeCash + tradeReceivables - tradeLiabilities;
        const roundedNisab = roundDownToThousand(goldNisabValue);
        let total = 0;
        let note = '';
        
        if (netWorth >= goldNisabValue && tradeHaul) {
          total = netWorth * ZAKAT_RATE;
          note = `Kekayaan bersih Rp ${netWorth.toLocaleString('id-ID')} mencapai nisab dan haul. Zakat = 2.5% × kekayaan bersih.`;
        } else {
          note = tradeHaul 
            ? `Kekayaan bersih Rp ${netWorth.toLocaleString('id-ID')} di bawah nisab.` 
            : 'Syarat haul (1 tahun) belum terpenuhi.';
        }
        
        setResult(roundDownToThousand(total));
        setNisabInfo(`Nisab: ${formatIDR(roundedNisab)} (${goldType === '24k' ? 'emas 24K' : 'emas 14K'} ${NISAB_GOLD_GRAM} gram)`);
        setCalculationNote(note);
        break;
      }

      case 'pertanian': {
        const rate = agriIrrigation === 'irrigated' ? AGRICULTURE_RATE_IRRIGATED : AGRICULTURE_RATE_RAINFED;
        const nisabRice = NISAB_RICE_KG_AGRICULTURE;
        const nisabDesc = `Nisab: ${NISAB_RICE_KG_AGRICULTURE} kg beras (atau ${NISAB_GABAH_KG_AGRICULTURE} kg gabah), tarif: ${rate * 100}%`;
        let total = 0;
        let note = '';
        
        if (agriHarvest >= nisabRice) {
          total = agriHarvest * ricePrice * rate;
          note = `Panen ${agriHarvest} kg mencapai nisab. Zakat = ${rate * 100}% × (${agriHarvest} kg × Rp ${ricePrice.toLocaleString('id-ID')}/kg).`;
        } else {
          note = `Panen ${agriHarvest} kg di bawah nisab (${nisabRice} kg).`;
        }
        
        setResult(roundDownToThousand(total));
        setNisabInfo(nisabDesc);
        setCalculationNote(note);
        break;
      }

      case 'peternakan': {
        const zakatInfo = calculateLivestockZakat(livestockType, livestockCount);
        let total = 0;
        let note = '';
        
        if (zakatInfo.amount > 0 && livestockHaul) {
          const pricePerAnimal = livestockType === 'goat' ? goatPrice : cowPrice;
          total = zakatInfo.amount * pricePerAnimal;
          note = `${zakatInfo.description}. Zakat dibayarkan dalam bentuk uang seharga ${livestockType === 'goat' ? 'kambing' : 'sapi'} Rp ${pricePerAnimal.toLocaleString('id-ID')}/ekor.`;
          setLivestockDetail(`${zakatInfo.description} (nilai ${formatIDR(roundDownToThousand(total))})`);
        } else {
          note = livestockHaul 
            ? zakatInfo.description 
            : 'Syarat haul (1 tahun) belum terpenuhi.';
          setLivestockDetail(zakatInfo.description);
        }
        
        setResult(roundDownToThousand(total));
        setNisabInfo(
          livestockType === 'goat'
            ? `Nisab kambing/domba: 40 ekor, haul 1 tahun.`
            : `Nisab sapi: 30 ekor, haul 1 tahun.`
        );
        setCalculationNote(note);
        break;
      }

      default:
        break;
    }
  };

  // Handler untuk validasi input non-negatif
  const handleNumberChange = (setter: (value: number) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '') {
      setter(0);
      return;
    }
    const num = Number(raw);
    if (!isNaN(num) && num >= 0) {
      setter(num);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-emerald-800">
            Kalkulator Zakat 2026
          </h1>
          <p className="text-emerald-600 mt-2">
            Sesuai Standar Kementerian Agama Republik Indonesia & BAZNAS
          </p>
        </div>

        {/* Panel Harga Acuan */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-emerald-100">
          <h2 className="font-semibold text-lg text-emerald-800 mb-4">Harga Acuan (dapat diubah)</h2>
          
          {/* Pilihan Jenis Emas untuk Nisab */}
          <div className="mb-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-sm font-medium text-amber-800 mb-2">Pilih Acuan Nisab (Zakat Penghasilan/Maal/Perdagangan):</p>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="24k"
                  checked={goldType === '24k'}
                  onChange={() => setGoldType('24k')}
                  className="mr-2"
                />
                Emas 24 Karat
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="14k"
                  checked={goldType === '14k'}
                  onChange={() => setGoldType('14k')}
                  className="mr-2"
                />
                Emas 14 Karat (Standar BAZNAS 2026)[reference:3]
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-1">*BAZNAS menetapkan acuan emas 14 karat untuk nisab zakat penghasilan tahun 2026.[reference:4]</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Harga Emas 24K per gram (Rp)
              </label>
              <input
                type="number"
                min="0"
                value={goldPrice24k}
                onChange={handleNumberChange(setGoldPrice24k)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Harga Emas 14K per gram (Rp)
              </label>
              <input
                type="number"
                min="0"
                value={goldPrice14k}
                onChange={handleNumberChange(setGoldPrice14k)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Harga Perak per gram (Rp)
              </label>
              <input
                type="number"
                min="0"
                value={silverPrice}
                onChange={handleNumberChange(setSilverPrice)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Harga Beras per kg (Rp)
              </label>
              <input
                type="number"
                min="0"
                value={ricePrice}
                onChange={handleNumberChange(setRicePrice)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Harga Kambing (Rp) - untuk zakat
              </label>
              <input
                type="number"
                min="0"
                value={goatPrice}
                onChange={handleNumberChange(setGoatPrice)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Harga Sapi (Rp) - untuk zakat
              </label>
              <input
                type="number"
                min="0"
                value={cowPrice}
                onChange={handleNumberChange(setCowPrice)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            *Nilai default mengacu pada data pasar terkini. Harga dapat berubah sewaktu-waktu.
          </p>
        </div>

        {/* Tabs dan Form */}
        <div className="flex flex-wrap gap-2 mb-6">
          {(['fitrah', 'maal', 'penghasilan', 'emas', 'perdagangan', 'pertanian', 'peternakan'] as ZakatType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg font-medium capitalize transition ${
                activeTab === tab
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-white text-gray-700 hover:bg-emerald-50 border border-gray-200'
              }`}
            >
              {tab === 'fitrah' && 'Fitrah'}
              {tab === 'maal' && 'Maal (Harta)'}
              {tab === 'penghasilan' && 'Penghasilan'}
              {tab === 'emas' && 'Emas/Perak'}
              {tab === 'perdagangan' && 'Perdagangan'}
              {tab === 'pertanian' && 'Pertanian'}
              {tab === 'peternakan' && 'Peternakan'}
            </button>
          ))}
        </div>

        {/* Form berdasarkan tab */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-emerald-100">
          {activeTab === 'fitrah' && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-emerald-800">Zakat Fitrah</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Jumlah Jiwa (termasuk diri sendiri)
                </label>
                <input
                  type="number"
                  min="0"
                  value={fitrahPersons}
                  onChange={(e) => setFitrahPersons(Math.max(0, Number(e.target.value)))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="money"
                    checked={fitrahMethod === 'money'}
                    onChange={() => setFitrahMethod('money')}
                    className="mr-2"
                  />
                  Uang (Rp)
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="rice"
                    checked={fitrahMethod === 'rice'}
                    onChange={() => setFitrahMethod('rice')}
                    className="mr-2"
                  />
                  Beras
                </label>
              </div>
              {fitrahMethod === 'rice' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Beras per jiwa (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={fitrahRiceKg}
                    onChange={(e) => setFitrahRiceKg(Math.max(0, Number(e.target.value)))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                  <p className="text-xs text-gray-500 mt-1">*Standar BAZNAS: 2,5 kg beras premium[reference:5]</p>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nilai Uang per jiwa (Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={fitrahMoney}
                    onChange={(e) => setFitrahMoney(Math.max(0, Number(e.target.value)))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                  <p className="text-xs text-gray-500 mt-1">*Standar BAZNAS 2026: Rp 50.000 (dapat berbeda di tiap daerah)[reference:6]</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'maal' && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-emerald-800">Zakat Maal (Harta)</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Harta (tabungan, deposito, dll) (Rp)
                </label>
                <input
                  type="number"
                  min="0"
                  value={maalWealth}
                  onChange={handleNumberChange(setMaalWealth)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={maalHaul}
                  onChange={(e) => setMaalHaul(e.target.checked)}
                  className="mr-2"
                />
                Sudah mencapai haul (1 tahun)
              </label>
            </div>
          )}

          {activeTab === 'penghasilan' && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-emerald-800">Zakat Penghasilan</h3>
              
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm font-medium text-blue-800 mb-2">Pilih Acuan Nisab:</p>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="gold"
                      checked={incomeNisabType === 'gold'}
                      onChange={() => setIncomeNisabType('gold')}
                      className="mr-2"
                    />
                    Emas (85 gram)
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="rice"
                      checked={incomeNisabType === 'rice'}
                      onChange={() => setIncomeNisabType('rice')}
                      className="mr-2"
                    />
                    Beras (520 kg)
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  *BAZNAS menggunakan acuan emas 14 karat, sedangkan pendapat lain menggunakan beras 520 kg.[reference:7]
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Penghasilan per bulan (Rp)
                </label>
                <input
                  type="number"
                  min="0"
                  value={incomeMonthly}
                  onChange={handleNumberChange(setIncomeMonthly)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={incomeHaul}
                  onChange={(e) => setIncomeHaul(e.target.checked)}
                  className="mr-2"
                />
                Sudah mencapai haul (1 tahun)
              </label>
            </div>
          )}

          {activeTab === 'emas' && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-emerald-800">Zakat Emas/Perak</h3>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="gold"
                    checked={preciousType === 'gold'}
                    onChange={() => setPreciousType('gold')}
                    className="mr-2"
                  />
                  Emas
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="silver"
                    checked={preciousType === 'silver'}
                    onChange={() => setPreciousType('silver')}
                    className="mr-2"
                  />
                  Perak
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Berat (gram)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={preciousWeight}
                  onChange={handleNumberChange(setPreciousWeight)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={preciousHaul}
                  onChange={(e) => setPreciousHaul(e.target.checked)}
                  className="mr-2"
                />
                Sudah mencapai haul (1 tahun)
              </label>
              <p className="text-sm text-gray-500">
                *Nisab emas: 85 gram, nisab perak: 595 gram.
              </p>
            </div>
          )}

          {activeTab === 'perdagangan' && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-emerald-800">Zakat Perdagangan</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nilai barang dagangan (Rp)
                </label>
                <input
                  type="number"
                  min="0"
                  value={tradeAssets}
                  onChange={handleNumberChange(setTradeAssets)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Uang tunai terkait dagangan (Rp)
                </label>
                <input
                  type="number"
                  min="0"
                  value={tradeCash}
                  onChange={handleNumberChange(setTradeCash)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Piutang (Rp)
                </label>
                <input
                  type="number"
                  min="0"
                  value={tradeReceivables}
                  onChange={handleNumberChange(setTradeReceivables)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hutang (Rp)
                </label>
                <input
                  type="number"
                  min="0"
                  value={tradeLiabilities}
                  onChange={handleNumberChange(setTradeLiabilities)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={tradeHaul}
                  onChange={(e) => setTradeHaul(e.target.checked)}
                  className="mr-2"
                />
                Sudah mencapai haul (1 tahun)
              </label>
              <p className="text-sm text-gray-500">
                *Zakat dihitung dari (aset + uang + piutang - hutang).
              </p>
            </div>
          )}

          {activeTab === 'pertanian' && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-emerald-800">Zakat Pertanian</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Jumlah hasil panen (kg)
                </label>
                <input
                  type="number"
                  min="0"
                  value={agriHarvest}
                  onChange={handleNumberChange(setAgriHarvest)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="irrigated"
                    checked={agriIrrigation === 'irrigated'}
                    onChange={() => setAgriIrrigation('irrigated')}
                    className="mr-2"
                  />
                  Irigasi berbayar (5%)
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="rainfed"
                    checked={agriIrrigation === 'rainfed'}
                    onChange={() => setAgriIrrigation('rainfed')}
                    className="mr-2"
                  />
                  Tadah hujan (10%)
                </label>
              </div>
              <p className="text-sm text-gray-500">
                *Nisab: 520 kg beras (setara 653 kg gabah). Zakat dibayarkan setiap panen.[reference:8]
              </p>
            </div>
          )}

          {activeTab === 'peternakan' && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-emerald-800">Zakat Peternakan</h3>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="goat"
                    checked={livestockType === 'goat'}
                    onChange={() => setLivestockType('goat')}
                    className="mr-2"
                  />
                  Kambing/Domba
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="cow"
                    checked={livestockType === 'cow'}
                    onChange={() => setLivestockType('cow')}
                    className="mr-2"
                  />
                  Sapi
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Jumlah ekor
                </label>
                <input
                  type="number"
                  min="0"
                  value={livestockCount}
                  onChange={handleNumberChange(setLivestockCount)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={livestockHaul}
                  onChange={(e) => setLivestockHaul(e.target.checked)}
                  className="mr-2"
                />
                Sudah mencapai haul (1 tahun)
              </label>
              <p className="text-sm text-gray-500">
                *Nisab kambing: 40 ekor. Nisab sapi: 30 ekor. Zakat dihitung bertingkat sesuai jumlah.[reference:9][reference:10]
              </p>
            </div>
          )}

          {/* Tombol Hitung */}
          <div className="mt-6">
            <button
              onClick={calculateZakat}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-lg transition shadow-md"
            >
              Hitung Zakat
            </button>
          </div>

          {/* Hasil */}
          {result !== null && (
            <div className="mt-6 p-5 bg-emerald-50 rounded-lg border border-emerald-200">
              <p className="text-sm text-emerald-700">{nisabInfo}</p>
              {activeTab === 'peternakan' && livestockDetail && (
                <p className="text-sm text-emerald-700 mt-1">{livestockDetail}</p>
              )}
              <p className="text-xl font-bold text-emerald-900 mt-2">
                Zakat yang harus dibayarkan: {formatIDR(result)}
              </p>
              {calculationNote && (
                <p className="text-sm text-gray-600 mt-1">{calculationNote}</p>
              )}
              {result === 0 && (
                <p className="text-sm text-amber-600 mt-2">
                  *Belum mencapai nisab atau haul, belum wajib zakat.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            Kalkulator ini menggunakan standar Kemenag RI dan BAZNAS. Untuk zakat yang lebih kompleks, disarankan berkonsultasi dengan amil zakat terpercaya.
          </p>
        </div>
      </div>
    </div>
  );
}