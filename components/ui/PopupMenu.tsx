'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

// Heroicons – Solid
import {
  CodeBracketIcon,
  BookOpenIcon,
  CalculatorIcon,        
  DocumentTextIcon,
  MagnifyingGlassIcon,
  UserIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/solid';

interface PopupItem {
  id: number;
  name: string;
  icon: React.ReactNode;
  comingSoon: boolean;
  href?: string;
}

const popupMenuItems: PopupItem[] = [
  { 
    id: 1, 
    name: 'Developer',
    icon: <CodeBracketIcon className="w-5 h-5" />,
    comingSoon: false, 
    href: '/developer' 
  },
  {
    id: 2, 
    name: 'Hadist',
    icon: <BookOpenIcon className="w-5 h-5" />, 
    comingSoon: false, 
    href: '/hadist' 
  },
  { 
    id: 3, 
    name: 'Kalkulator Zakat',         
    icon: <CalculatorIcon className="w-5 h-5" />,
    comingSoon: false, 
    href: '/kalkulator-zakat'             
  },
  { 
    id: 4, 
    name: 'Sejarah', 
    icon: <DocumentTextIcon className="w-5 h-5" />, 
    comingSoon: true 
  },
  { 
    id: 5, 
    name: 'Cari', 
    icon: <MagnifyingGlassIcon className="w-5 h-5" />, 
    comingSoon: true 
  },
  { 
    id: 6, 
    name: 'Profil', 
    icon: <UserIcon className="w-5 h-5" />, 
    comingSoon: true 
  },
  { 
    id: 7, 
    name: 'Setelan', 
    icon: <Cog6ToothIcon className="w-5 h-5" />, 
    comingSoon: true 
  },
];

interface PopupMenuProps {
  onClose: () => void;
}

const PopupMenu: React.FC<PopupMenuProps> = ({ onClose }) => {
  const router = useRouter();

  const handleItemClick = (item: PopupItem) => {
    if (item.comingSoon) {
      alert(`"${item.name}" akan segera hadir`);
    } else if (item.href) {
      router.push(item.href);
    }
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="bg-white rounded-xl shadow-xl border border-gray-200 p-4"
    >
      <div className="grid grid-cols-3 gap-2">
        {popupMenuItems.map((item) => (
          <button
            key={item.id}
            disabled={item.comingSoon}
            className="flex flex-col items-center p-2 rounded-lg hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
            onClick={() => handleItemClick(item)}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${
                item.comingSoon
                  ? 'bg-gray-100 text-gray-400'
                  : 'bg-blue-50 text-blue-600'
              }`}
            >
              {item.icon}
            </div>
            <span className="text-[11px] font-medium text-gray-800 text-center leading-tight">
              {item.name}
            </span>
            {item.comingSoon && (
              <span className="text-[9px] text-gray-400">Soon</span>
            )}
          </button>
        ))}
      </div>
    </motion.div>
  );
};

export default PopupMenu;