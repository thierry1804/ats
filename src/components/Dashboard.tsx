import React from 'react';
import { Users, Briefcase, UserCheck, UserX } from 'lucide-react';

const StatCard = ({ icon, label, value, color }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) => (
  <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
    <div className={`w-12 h-12 rounded-full ${color} flex items-center justify-center mb-4`}>
      {icon}
    </div>
    <h3 className="text-gray-500 text-sm">{label}</h3>
    <p className="text-2xl font-semibold mt-1">{value}</p>
  </div>
);

export default function Dashboard() {
  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-6">Dashboard</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={<Users className="w-6 h-6 text-blue-600" />}
          label="Total Candidates"
          value="156"
          color="bg-blue-50"
        />
        <StatCard
          icon={<Briefcase className="w-6 h-6 text-green-600" />}
          label="Open Positions"
          value="12"
          color="bg-green-50"
        />
        <StatCard
          icon={<UserCheck className="w-6 h-6 text-purple-600" />}
          label="Interviews This Week"
          value="8"
          color="bg-purple-50"
        />
        <StatCard
          icon={<UserX className="w-6 h-6 text-orange-600" />}
          label="Pending Review"
          value="24"
          color="bg-orange-50"
        />
      </div>

      <div className="mt-8 bg-white rounded-lg p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold mb-4">Recent Applications</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-gray-200">
                <th className="pb-3 font-medium text-gray-600">Name</th>
                <th className="pb-3 font-medium text-gray-600">Position</th>
                <th className="pb-3 font-medium text-gray-600">Applied Date</th>
                <th className="pb-3 font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-3">Sarah Johnson</td>
                <td className="py-3">Senior Developer</td>
                <td className="py-3">Mar 15, 2024</td>
                <td className="py-3">
                  <span className="px-2 py-1 text-sm rounded-full bg-yellow-50 text-yellow-700">
                    Reviewing
                  </span>
                </td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3">Michael Chen</td>
                <td className="py-3">Product Manager</td>
                <td className="py-3">Mar 14, 2024</td>
                <td className="py-3">
                  <span className="px-2 py-1 text-sm rounded-full bg-green-50 text-green-700">
                    Interviewed
                  </span>
                </td>
              </tr>
              <tr>
                <td className="py-3">Emily Wilson</td>
                <td className="py-3">UX Designer</td>
                <td className="py-3">Mar 13, 2024</td>
                <td className="py-3">
                  <span className="px-2 py-1 text-sm rounded-full bg-blue-50 text-blue-700">
                    New
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}