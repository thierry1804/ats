import React from 'react';
import { LayoutDashboard, Users, Briefcase, Settings } from 'lucide-react';

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}

const NavItem = ({ icon, label, active, onClick }: NavItemProps) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
      active ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'
    }`}
  >
    {icon}
    <span className="font-medium">{label}</span>
  </button>
);

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  return (
    <div className="w-64 h-screen bg-white border-r border-gray-200 p-4">
      <div className="flex items-center space-x-3 px-4 py-5">
        <Briefcase className="w-8 h-8 text-blue-600" />
        <h1 className="text-xl font-bold">TalentTrack</h1>
      </div>
      
      <nav className="space-y-2 mt-8">
        <NavItem
          icon={<LayoutDashboard className="w-5 h-5" />}
          label="Dashboard"
          active={activeTab === 'dashboard'}
          onClick={() => onTabChange('dashboard')}
        />
        <NavItem
          icon={<Users className="w-5 h-5" />}
          label="Candidates"
          active={activeTab === 'candidates'}
          onClick={() => onTabChange('candidates')}
        />
        <NavItem
          icon={<Briefcase className="w-5 h-5" />}
          label="Jobs"
          active={activeTab === 'jobs'}
          onClick={() => onTabChange('jobs')}
        />
        <NavItem
          icon={<Settings className="w-5 h-5" />}
          label="Settings"
          active={activeTab === 'settings'}
          onClick={() => onTabChange('settings')}
        />
      </nav>
    </div>
  );
}