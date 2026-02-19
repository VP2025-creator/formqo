import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import {
  Plus, BarChart3, Eye, MoreHorizontal, Zap, Users,
  TrendingUp, FileText, Clock, ChevronRight
} from "lucide-react";

const mockForms = [
  {
    id: "1",
    title: "Customer Satisfaction Survey",
    responses: 142,
    views: 389,
    status: "active",
    updatedAt: "2 hours ago",
    completionRate: 76,
  },
  {
    id: "2",
    title: "Product Feedback Form",
    responses: 87,
    views: 210,
    status: "active",
    updatedAt: "Yesterday",
    completionRate: 61,
  },
  {
    id: "3",
    title: "Job Application — Designer",
    responses: 34,
    views: 156,
    status: "closed",
    updatedAt: "3 days ago",
    completionRate: 89,
  },
];

const stats = [
  { label: "Total responses", value: "263", icon: BarChart3, change: "+12%" },
  { label: "Active forms", value: "2", icon: FileText, change: "of 3 total" },
  { label: "Avg. completion", value: "75%", icon: TrendingUp, change: "+4% this week" },
  { label: "Team members", value: "1", icon: Users, change: "Free plan" },
];

const Dashboard = () => {
  return (
    <div className="min-h-screen bg-muted/20">
      <Navbar variant="dashboard" userRole="user" />

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display font-bold text-2xl text-foreground">My Forms</h1>
            <p className="text-sm text-muted-foreground mt-1">Welcome back — here's what's happening</p>
          </div>
          <button className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={16} />
            New form
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => (
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

        {/* Forms list */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden mb-6">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="font-display font-semibold text-sm">Your forms</h2>
            <span className="text-xs text-muted-foreground">{mockForms.length} of 3 (free plan)</span>
          </div>
          <div className="divide-y divide-border">
            {mockForms.map((form) => (
              <div key={form.id} className="flex items-center gap-4 px-6 py-4 hover:bg-muted/30 transition-colors group">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-sm text-foreground truncate">{form.title}</p>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        form.status === "active"
                          ? "bg-green-50 text-green-700"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {form.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock size={11} /> {form.updatedAt}</span>
                    <span>{form.responses} responses</span>
                    <span>{form.views} views</span>
                    <span>{form.completionRate}% completion</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="text-xs px-3 py-1.5 rounded-md border border-border hover:border-primary hover:text-primary transition-colors flex items-center gap-1">
                    <Eye size={12} /> Preview
                  </button>
                  <button className="text-xs px-3 py-1.5 rounded-md border border-border hover:border-primary hover:text-primary transition-colors flex items-center gap-1">
                    <BarChart3 size={12} /> Results
                  </button>
                  <button className="p-1.5 rounded-md border border-border hover:border-primary hover:text-primary transition-colors">
                    <MoreHorizontal size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upgrade banner */}
        <div className="rounded-2xl border border-primary/20 bg-primary-light p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
              <Zap size={18} className="text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-sm text-foreground mb-1">Upgrade to Pro</h3>
              <p className="text-xs text-muted-foreground">
                Unlock unlimited forms, AI question generation, remove Formqo branding, and more.
              </p>
            </div>
          </div>
          <Link to="/pricing" className="btn-primary flex items-center gap-1.5 text-sm whitespace-nowrap">
            Upgrade now <ChevronRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
