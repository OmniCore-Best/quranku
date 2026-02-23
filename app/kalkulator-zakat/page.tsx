'use client';

import { useState, useEffect } from 'react';

// Tipe data untuk setiap jenis zakat
type ZakatType = 'fitrah' | 'maal' | 'penghasilan' | 'emas' | 'perdagangan' | 'pertanian' | 'peternakan';

// Konstanta nisab
const NISAB_GOLD_GRAM = 85;           // nisab emas 85 gram
const NISAB_SILVER_GRAM = 595;        // nisab perak 595 gram
const NISAB_RICE_KG = 520;             // nisab beras untuk zakat penghasilan (520 kg)
const NISAB_AGRICULTURE_KG = 653;      // nisab pertanian 653 kg gabah/beras
const ZAKAT_RATE = 0.025;               // 2.5%

// Tarif zakat pertanian
const AGRICULTURE_RATE_IRRIGATED = 0.05;   // 5% jika pakai irigasi
const AGRICULTURE_RATE_RAINFED = 0.10;     // 10% jika tadah hujan

// Harga default berdasarkan data terkini (per 19 Februari 2026)
const DEFAULT_GOLD_PRICE = 2916000;     // Rp 2.916.000 per gram (24 karat)
const DEFAULT_GOLD14_PRICE = 1700000;   // Rp 1.700.000 per gram (estimasi 14 karat)
const DEFAULT_RICE_PRICE = 14900;        // Rp 14.900 per kg
const DEFAULT_FITRAH_AMOUNT = 50000;     // Rp 50.000 per jiwa

export default function KalkulatorZakat() {
  const [activeTab, setActiveTab] = useState<ZakatType>('fitrah');

  // State untuk jenis emas yang digunakan sebagai acuan nisab
  const [goldType, setGoldType] = useState<'24k' | '14k'>('24k');
  
  // State global untuk harga acuan
  const [goldPrice, setGoldPrice] = useState(DEFAULT_GOLD_PRICE);
  const [gold14Price, setGold14Price] = useState(DEFAULT_GOLD14_PRICE);
  const [ricePrice, setRicePrice] = useState(DEFAULT_RICE_PRICE);
  const [goatPrice, setGoatPrice] = useState(2000000); // Harga kambing
  const [cowPrice, setCowPrice] = useState(15000000);  // Harga sapi

  // State untuk masing-masing formulir
  // Zakat Fitrah
  const [fitrahPersons, setFitrahPersons] = useState(1);
  const [fitrahMethod, setFitrahMethod] = useState<'rice' | 'money'>('money');
  const [fitrahRiceKg, setFitrahRiceKg] = useState(2.5);
  const [fitrahMoney, setFitrahMoney] = useState(DEFAULT_FITRAH_AMOUNT);

  // Zakat Maal
  const [maalWealth, setMaalWealth] = useState(0);
  const [maalHaul, setMaalHaul] = useState(false);

  // Zakat Penghasilan
  const [incomeMonthly, setIncomeMonthly] = useState(0);
  const [incomeHaul, setIncomeHaul] = useState(false);

  // Zakat Emas/Perak
  const [preciousType, setPreciousType] = useState<'gold' | 'silver'>('gold');
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
  const [agriPrice, setAgriPrice] = useState(ricePrice);
  const [agriIrrigation, setAgriIrrigation] = useState<'irrigated' | 'rainfed'>('irrigated');

  // Zakat Peternakan
  const [livestockType, setLivestockType] = useState<'goat' | 'cow'>('goat');
  const [livestockCount, setLivestockCount] = useState(0);
  const [livestockHaul, setLivestockHaul] = useState(false);

  // Hasil perhitungan
  const [result, setResult] = useState<number | null>(null);
  const [nisabInfo, setNisabInfo] = useState<string>('');

  // Fungsi untuk mendapatkan harga emas aktif berdasarkan pilihan
  const getActiveGoldPrice = () => {
    return goldType === '24k' ? goldPrice : gold14Price;
  };

  // Format mata uang
  const formatIDR = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Hitung zakat
  const calculateZakat = () => {
    setResult(null);
    setNisabInfo('');
    const activeGoldPrice = getActiveGoldPrice();
    const nisabValue = NISAB_GOLD_GRAM * activeGoldPrice;

    switch (activeTab) {
      case 'fitrah': {
        let total = 0;
        if (fitrahMethod === 'rice') {
          total = fitrahPersons * fitrahRiceKg * ricePrice;
        } else {
          total = fitrahPersons * fitrahMoney;
        }
        setResult(total);
        setNisabInfo(`Fitrah untuk ${fitrahPersons} jiwa`);
        break;
      }

      case 'maal': {
        setNisabInfo(`Nisab: ${formatIDR(nisabValue)} (${goldType === '24k' ? 'emas 24K' : 'emas 14K'} ${NISAB_GOLD_GRAM} gram)`);
        if (maalWealth >= nisabValue && maalHaul) {
          setResult(maalWealth * ZAKAT_RATE);
        } else {
          setResult(0);
        }
        break;
      }

      case 'penghasilan': {
        const nisabRice = NISAB_RICE_KG * ricePrice;
        const annualIncome = incomeMonthly * 12;
        setNisabInfo(`Nisab: ${formatIDR(nisabRice)} (setara ${NISAB_RICE_KG} kg beras)`);
        if (annualIncome >= nisabRice && incomeHaul) {
          setResult(annualIncome * ZAKAT_RATE);
        } else {
          setResult(0);
        }
        break;
      }

      case 'emas': {
        const nisabGram = preciousType === 'gold' ? NISAB_GOLD_GRAM : NISAB_SILVER_GRAM;
        // Untuk perak, gunakan asumsi harga (1/85 * 595 * harga emas aktif)
        const pricePerGram = preciousType === 'gold' 
          ? activeGoldPrice 
          : (activeGoldPrice / 85) * 595;
        const value = preciousWeight * pricePerGram;
        const nisabValue = nisabGram * pricePerGram;
        setNisabInfo(`Nisab: ${nisabGram} gram, nilai nisab ${formatIDR(nisabValue)}`);
        if (preciousWeight >= nisabGram && preciousHaul) {
          setResult(value * ZAKAT_RATE);
        } else {
          setResult(0);
        }
        break;
      }

      case 'perdagangan': {
        const netWorth = tradeAssets + tradeCash + tradeReceivables - tradeLiabilities;
        setNisabInfo(`Nisab: ${formatIDR(nisabValue)} (${goldType === '24k' ? 'emas 24K' : 'emas 14K'} ${NISAB_GOLD_GRAM} gram)`);
        if (netWorth >= nisabValue && tradeHaul) {
          setResult(netWorth * ZAKAT_RATE);
        } else {
          setResult(0);
        }
        break;
      }

      case 'pertanian': {
        const rate = agriIrrigation === 'irrigated' ? AGRICULTURE_RATE_IRRIGATED : AGRICULTURE_RATE_RAINFED;
        setNisabInfo(`Nisab: ${NISAB_AGRICULTURE_KG} kg, tarif: ${rate * 100}%`);
        if (agriHarvest >= NISAB_AGRICULTURE_KG) {
          setResult(agriHarvest * agriPrice * rate);
        } else {
          setResult(0);
        }
        break;
      }

      case 'peternakan': {
        if (livestockType === 'goat') {
          setNisabInfo('Nisab kambing/domba: 40 ekor, haul 1 tahun. Zakat: 1 ekor umur 2 tahun.');
          if (livestockCount >= 40 && livestockHaul) {
            setResult(goatPrice);
          } else {
            setResult(0);
          }
        } else {
          setNisabInfo('Nisab sapi: 30 ekor, haul 1 tahun. Zakat: 1 ekor umur 1 tahun.');
          if (livestockCount >= 30 && livestockHaul) {
            setResult(cowPrice);
          } else {
            setResult(0);
          }
        }
        break;
      }

      default:
        break;
    }
  };

  // Sinkronisasi harga pertanian dengan harga beras
  useEffect(() => {
    setAgriPrice(ricePrice);
  }, [ricePrice]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-emerald-800">
            Kalkulator Zakat 2026
          </h1>
          <p className="text-emerald-600 mt-2">
            Sesuai Standar Kementerian Agama Republik Indonesia
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
                Emas 24 Karat (Standar Lama)
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="14k"
                  checked={goldType === '14k'}
                  onChange={() => setGoldType('14k')}
                  className="mr-2"
                />
                Emas 14 Karat (Usulan Baznas 2026)
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-1">*Baznas mengusulkan perubahan acuan ke emas 14 karat untuk menyesuaikan dengan harga terkini [citation:1].</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Harga Emas 24K per gram (Rp)
              </label>
              <input
                type="number"
                value={goldPrice}
                onChange={(e) => setGoldPrice(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Harga Emas 14K per gram (Rp)
              </label>
              <input
                type="number"
                value={gold14Price}
                onChange={(e) => setGold14Price(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Harga Beras per kg (Rp)
              </label>
              <input
                type="number"
                value={ricePrice}
                onChange={(e) => setRicePrice(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Harga Kambing (Rp) - untuk zakat
              </label>
              <input
                type="number"
                value={goatPrice}
                onChange={(e) => setGoatPrice(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Harga Sapi (Rp) - untuk zakat
              </label>
              <input
                type="number"
                value={cowPrice}
                onChange={(e) => setCowPrice(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">*Nilai default berdasarkan data pasar per 19 Februari 2026 dan estimasi Baznas.</p>
        </div>

        {/* Tabs dan Form (sama seperti sebelumnya, tidak berubah) */}
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

        {/* Form berdasarkan tab (isi persis sama dengan kode sebelumnya, tidak perlu diubah) */}
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
                  min="1"
                  value={fitrahPersons}
                  onChange={(e) => setFitrahPersons(Math.max(1, Number(e.target.value)))}
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
                    value={fitrahRiceKg}
                    onChange={(e) => setFitrahRiceKg(Number(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                  <p className="text-xs text-gray-500 mt-1">*Standar Baznas: 2,5 kg beras premium [citation:2]</p>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nilai Uang per jiwa (Rp)
                  </label>
                  <input
                    type="number"
                    value={fitrahMoney}
                    onChange={(e) => setFitrahMoney(Number(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                  <p className="text-xs text-gray-500 mt-1">*Standar Baznas: Rp 50.000 [citation:2] (dapat berbeda di tiap daerah [citation:9])</p>
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
                  value={maalWealth}
                  onChange={(e) => setMaalWealth(Number(e.target.value))}
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
                Sudah mencapai haul (1 tahun) [citation:8]
              </label>
            </div>
          )}

          {activeTab === 'penghasilan' && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-emerald-800">Zakat Penghasilan</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Penghasilan per bulan (Rp)
                </label>
                <input
                  type="number"
                  value={incomeMonthly}
                  onChange={(e) => setIncomeMonthly(Number(e.target.value))}
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
                Sudah mencapai haul (1 tahun) [citation:8]
              </label>
              <p className="text-sm text-gray-500">
                *Nisab dihitung dari total penghasilan tahunan (12 bulan) setara 520 kg beras [citation:3][citation:4].
              </p>
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
                  value={preciousWeight}
                  onChange={(e) => setPreciousWeight(Number(e.target.value))}
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
                Sudah mencapai haul (1 tahun) [citation:8]
              </label>
              <p className="text-sm text-gray-500">
                *Nisab emas: 85 gram, nisab perak: 595 gram [citation:4].
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
                  value={tradeAssets}
                  onChange={(e) => setTradeAssets(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Uang tunai terkait dagangan (Rp)
                </label>
                <input
                  type="number"
                  value={tradeCash}
                  onChange={(e) => setTradeCash(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Piutang (Rp)
                </label>
                <input
                  type="number"
                  value={tradeReceivables}
                  onChange={(e) => setTradeReceivables(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hutang (Rp)
                </label>
                <input
                  type="number"
                  value={tradeLiabilities}
                  onChange={(e) => setTradeLiabilities(Number(e.target.value))}
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
                Sudah mencapai haul (1 tahun) [citation:8]
              </label>
              <p className="text-sm text-gray-500">
                *Zakat dihitung dari (aset + uang + piutang - hutang) [citation:4][citation:5].
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
                  value={agriHarvest}
                  onChange={(e) => setAgriHarvest(Number(e.target.value))}
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
                *Nisab: 653 kg gabah atau 520 kg beras. Zakat dibayarkan setiap panen [citation:3][citation:6].
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
                  value={livestockCount}
                  onChange={(e) => setLivestockCount(Number(e.target.value))}
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
                Sudah mencapai haul (1 tahun) [citation:8]
              </label>
              <p className="text-sm text-gray-500">
                *Nisab kambing: 40 ekor, zakat 1 ekor umur 2 tahun. Sapi: 30 ekor, zakat 1 ekor umur 1 tahun [citation:4][citation:7].
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
              <p className="text-xl font-bold text-emerald-900 mt-2">
                Zakat yang harus dibayarkan: {formatIDR(result)}
              </p>
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
            Kalkulator ini menggunakan standar Kemenag RI. Untuk zakat yang lebih kompleks, disarankan berkonsultasi dengan amil zakat terpercaya.
          </p>
        </div>
      </div>
    </div>
  );
}