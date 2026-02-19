import { useState } from "react";
import Navbar from "@/components/Navbar";
import {
  Users, BarChart3, FileText, TrendingUp, Search, MoreHorizontal,
  Shield, AlertCircle, ChevronDown, Download
} from "lucide-react";

const mockUsers = [
  { id: "1", name: "Alex Johnson", email: "alex@company.com", plan: "Pro", forms: 12, responses: 1240, joined: "Jan 12, 2025", status: "active" },
  { id: "2", name: "Sarah Chen", email: "sarah@luminary.io", plan: "Business", forms: 47, responses: 8932, joined: "Nov 3, 2024", status: "active" },
  { id: "3", name: "Marcus Webb", email: "marcus@foundry.co", plan: "Free", forms: 2, responses: 34, joined: "Feb 1, 2025", status: "active" },
  { id: "4", name: "Priya Sharma", email: "priya@prism.dev", plan: "Pro", forms: 8, responses: 456, joined: "Dec 20, 2024", status: "suspended" },
  { id: "5", name: "Tom Bradley", email: "tom@axon.com", plan: "Free", forms: 1, responses: 12, joined: "Feb 10, 2025", status: "active" },
];

const adminStats = [
  { label: "Total users", value: "12,847", icon: Users, change: "+342 this month" },
  { label: "Total forms", value: "48,291", icon: FileText, change: "+1.2k this week" },
  { label: "Total responses", value: "2.4M", icon: BarChart3, change: "+88k this week" },
  { label: "MRR", value: "£18,420", icon: TrendingUp, change: "+12.4% vs last month" },
];

const planColors: Record<string, string> = {
  Free: "bg-muted text-muted-foreground",
  Pro: "bg-primary-light text-primary",
  Business: "bg-foreground text-background",
};

const statusColors: Record<string, string> = {
  active: "bg-green-50 text-green-700",
  suspended: "bg-red-50 text-red-700",
};

const AdminDashboard = () => {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"users" | "forms" | "analytics">("users");

  const filtered = mockUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-muted/20">
      <Navbar variant="dashboard" userRole="admin" />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Shield size={16} className="text-primary" />
              <span className="text-xs font-semibold text-primary tracking-widest uppercase">Admin</span>
            </div>
            <h1 className="font-display font-bold text-2xl text-foreground">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">Formqo platform management</p>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:border-primary hover:text-primary transition-colors">
            <Download size={14} /> Export data
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {adminStats.map((stat) => (
            <div key={stat.label} className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted-foreground">{stat.label}</span>
                <stat.icon size={15} className="text-muted-foreground" />
              </div>
              <p className="font-display font-bold text-2xl text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted rounded-lg p-1 mb-6 w-fit">
          {(["users", "forms", "analytics"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-all ${
                activeTab === tab
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === "users" && (
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            {/* Table header */}
            <div className="px-6 py-4 border-b border-border flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
              <h2 className="font-display font-semibold text-sm">All users ({mockUsers.length.toLocaleString()})</h2>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 pr-4 py-2 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary w-64 transition-all"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {["User", "Plan", "Forms", "Responses", "Joined", "Status", ""].map((h) => (
                      <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-6 py-3">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((user) => (
                    <tr key={user.id} className="hover:bg-muted/20 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary-light flex items-center justify-center text-primary font-display font-semibold text-sm shrink-0">
                            {user.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{user.name}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${planColors[user.plan]}`}>
                          {user.plan}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground">{user.forms}</td>
                      <td className="px-6 py-4 text-sm text-foreground">{user.responses.toLocaleString()}</td>
                      <td className="px-6 py-4 text-xs text-muted-foreground">{user.joined}</td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[user.status]}`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button className="p-1.5 rounded-md border border-transparent group-hover:border-border hover:border-primary hover:text-primary transition-colors">
                          <MoreHorizontal size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 border-t border-border flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Showing {filtered.length} of {mockUsers.length} users</span>
              <div className="flex items-center gap-1">
                {[1, 2, 3].map((p) => (
                  <button
                    key={p}
                    className={`w-7 h-7 rounded text-xs font-medium transition-colors ${p === 1 ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"}`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "forms" && (
          <div className="bg-card rounded-2xl border border-border p-8 text-center">
            <FileText size={32} className="text-muted-foreground mx-auto mb-4" />
            <h3 className="font-display font-semibold text-lg mb-2">Forms management</h3>
            <p className="text-sm text-muted-foreground">View, search and moderate all forms created on the platform. Connect Lovable Cloud to enable this section.</p>
          </div>
        )}

        {activeTab === "analytics" && (
          <div className="bg-card rounded-2xl border border-border p-8 text-center">
            <BarChart3 size={32} className="text-muted-foreground mx-auto mb-4" />
            <h3 className="font-display font-semibold text-lg mb-2">Platform analytics</h3>
            <p className="text-sm text-muted-foreground">Detailed growth metrics, revenue analytics, and user behaviour insights. Connect Lovable Cloud to enable full analytics.</p>
          </div>
        )}

        {/* System alerts */}
        <div className="mt-6 rounded-xl border border-border bg-muted p-4 flex items-start gap-3">
          <AlertCircle size={16} className="text-primary mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-foreground">Connect Lovable Cloud for live data</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              User data, form analytics, and admin actions are currently using mock data. Enable Lovable Cloud to connect a real database.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
