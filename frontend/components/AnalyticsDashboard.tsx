// @ts-nocheck
import { useState, useEffect } from 'react';
import { getAnalyticsOverview, getTrips, addExpense } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Loader2, Plane, DollarSign, TrendingUp, PieChart, BarChart3, Calendar, MapPin, Wallet, Plus, X } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RePieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';
import { cn } from '../lib/utils';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
  planned: '#888',
  active: '#1D9E75',
  completed: '#378ADD',
  cancelled: '#D85A30',
};

const CATEGORY_COLORS = [
  '#1D9E75', '#378ADD', '#D85A30', '#7F77DD',
  '#BA7517', '#D4537E', '#2D6A4F', '#1E4D8C',
];

export default function AnalyticsDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Quick expense form state
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [userTrips, setUserTrips] = useState([]);
  const [expenseTripId, setExpenseTripId] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseSaving, setExpenseSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    fetchAnalytics();
  }, [user]);

  const fetchAnalytics = async () => {
    try {
      const res = await getAnalyticsOverview();
      setData(res.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const openExpenseForm = async () => {
    try {
      const res = await getTrips();
      const trips = res.data || [];
      setUserTrips(trips);
      if (trips.length > 0) {
        setExpenseTripId(String(trips[0].id));
      }
    } catch {
      setUserTrips([]);
    }
    setExpenseCategory('Food');
    setExpenseAmount('');
    setExpenseDesc('');
    setShowExpenseForm(true);
  };

  const handleAddExpense = async () => {
    if (!expenseTripId || !expenseAmount || !expenseCategory) {
      toast.error('Fill in trip, amount, and category');
      return;
    }
    setExpenseSaving(true);
    try {
      await addExpense(Number(expenseTripId), {
        category: expenseCategory,
        description: expenseDesc || expenseCategory,
        amount: Number(expenseAmount),
      });
      toast.success('Expense added!');
      setShowExpenseForm(false);
      fetchAnalytics();
    } catch {
      toast.error('Failed to add expense');
    } finally {
      setExpenseSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-40" />
        <p className="text-sm font-medium">Sign in to view your travel analytics</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data || data.trips_count === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-40" />
        <p className="text-sm font-medium">No trip data yet</p>
        <p className="text-xs mt-1">Create trips in the My Trips tab to see analytics</p>
      </div>
    );
  }

  const statusData = Object.entries(data.status_counts || {}).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    color: STATUS_COLORS[name] || '#888',
  }));

  const expenseData = Object.entries(data.expense_categories || {}).map(([name, value], i) => ({
    name,
    value: Math.round(value),
    color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
  }));

  const destinationData = (data.destinations || []).slice(0, 10).map((d) => ({
    name: d.name.length > 12 ? d.name.slice(0, 12) + '...' : d.name,
    Budget: d.budget,
    Spent: d.spent,
  }));

  const statCards = [
    {
      label: 'Total Trips',
      value: data.trips_count,
      icon: Plane,
      color: 'text-primary bg-primary/10',
    },
    {
      label: 'Total Budget',
      value: `$${(data.total_budget || 0).toLocaleString()}`,
      icon: Wallet,
      color: 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-950/30',
    },
    {
      label: 'Total Spent',
      value: `$${(data.total_spent || 0).toLocaleString()}`,
      icon: DollarSign,
      color: 'text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-950/30',
    },
    {
      label: 'Avg / Trip',
      value: `$${(data.avg_spent_per_trip || 0).toLocaleString()}`,
      icon: TrendingUp,
      color: 'text-forest-600 bg-forest-100 dark:text-forest-400 dark:bg-forest-950/30',
    },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-card border border-border rounded-2xl p-4"
            >
              <div className="flex items-center gap-3">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', card.color)}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{card.label}</div>
                  <div className="text-xl font-semibold text-foreground">{card.value}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick expense form */}
      {showExpenseForm ? (
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
              <Plus className="w-4 h-4 text-primary" />
              Quick Add Expense
            </h3>
            <button onClick={() => setShowExpenseForm(false)} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2 items-end">
            <div className="flex-1 min-w-[120px]">
              <label className="text-[10px] text-muted-foreground block mb-1">Trip</label>
              <select
                value={expenseTripId}
                onChange={(e) => setExpenseTripId(e.target.value)}
                className="w-full text-xs bg-secondary rounded-lg px-2 py-1.5 border border-border outline-none"
              >
                {userTrips.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.destination || t.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-24">
              <label className="text-[10px] text-muted-foreground block mb-1">Category</label>
              <select
                value={expenseCategory}
                onChange={(e) => setExpenseCategory(e.target.value)}
                className="w-full text-xs bg-secondary rounded-lg px-2 py-1.5 border border-border outline-none"
              >
                {['Food', 'Transport', 'Accommodation', 'Activities', 'Shopping', 'Other'].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="w-24">
              <label className="text-[10px] text-muted-foreground block mb-1">Amount ($)</label>
              <input
                type="number"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
                placeholder="0"
                className="w-full text-xs bg-secondary rounded-lg px-2 py-1.5 border border-border outline-none"
              />
            </div>
            <div className="flex-1 min-w-[100px]">
              <label className="text-[10px] text-muted-foreground block mb-1">Description</label>
              <input
                value={expenseDesc}
                onChange={(e) => setExpenseDesc(e.target.value)}
                placeholder="Lunch, taxi..."
                className="w-full text-xs bg-secondary rounded-lg px-2 py-1.5 border border-border outline-none"
              />
            </div>
            <button
              onClick={handleAddExpense}
              disabled={expenseSaving}
              className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:opacity-90 transition-all disabled:opacity-50"
            >
              {expenseSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Add'}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={openExpenseForm}
          className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add expense to a trip
        </button>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Budget vs Spent by Destination */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-display text-base font-semibold text-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            Budget vs Spent by Destination
          </h3>
          {destinationData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={destinationData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border, #ede4d0)" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: 'var(--muted-foreground, #856643)' }}
                  axisLine={{ stroke: 'var(--border, #ede4d0)' }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'var(--muted-foreground, #856643)' }}
                  axisLine={{ stroke: 'var(--border, #ede4d0)' }}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--card, #fff)',
                    border: '1px solid var(--border, #ede4d0)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="Budget" fill="#1D9E75" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Spent" fill="#D85A30" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No destination data</p>
          )}
        </div>

        {/* Spending by Category */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-display text-base font-semibold text-foreground mb-4 flex items-center gap-2">
            <PieChart className="w-4 h-4 text-primary" />
            Spending by Category
          </h3>
          {expenseData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <RePieChart>
                <Pie
                  data={expenseData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  innerRadius={50}
                  paddingAngle={3}
                >
                  {expenseData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'var(--card, #fff)',
                    border: '1px solid var(--border, #ede4d0)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value) => `$${value.toLocaleString()}`}
                />
                <Legend
                  wrapperStyle={{ fontSize: '11px', color: 'var(--muted-foreground, #856643)' }}
                />
              </RePieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              Add expenses to trips to see breakdown
            </p>
          )}
        </div>

        {/* Monthly Spending Trend */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-display text-base font-semibold text-foreground mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            Monthly Spending Trend
          </h3>
          {(data.monthly_spending || []).length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={data.monthly_spending}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border, #ede4d0)" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: 'var(--muted-foreground, #856643)' }}
                  axisLine={{ stroke: 'var(--border, #ede4d0)' }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'var(--muted-foreground, #856643)' }}
                  axisLine={{ stroke: 'var(--border, #ede4d0)' }}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--card, #fff)',
                    border: '1px solid var(--border, #ede4d0)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                  formatter={(value) => `$${value.toLocaleString()}`}
                />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="#1D9E75"
                  strokeWidth={2}
                  dot={{ fill: '#1D9E75', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No trip date data available
            </p>
          )}
        </div>

        {/* Trips by Status */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-display text-base font-semibold text-foreground mb-4 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            Trips by Status
          </h3>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <RePieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  innerRadius={50}
                  paddingAngle={3}
                >
                  {statusData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'var(--card, #fff)',
                    border: '1px solid var(--border, #ede4d0)',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '11px', color: 'var(--muted-foreground, #856643)' }}
                />
              </RePieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No trip data</p>
          )}
        </div>
      </div>

      {/* Destination table */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <h3 className="font-display text-base font-semibold text-foreground mb-4 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" />
          All Destinations
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wide">
                <th className="text-left py-2 pr-4 font-medium">Destination</th>
                <th className="text-right py-2 px-4 font-medium">Budget</th>
                <th className="text-right py-2 px-4 font-medium">Spent</th>
                <th className="text-right py-2 pl-4 font-medium">Remaining</th>
              </tr>
            </thead>
            <tbody>
              {(data.destinations || []).map((dest, i) => (
                <tr key={i} className="border-b border-border/50 hover:bg-secondary/50 transition-colors">
                  <td className="py-3 pr-4 text-foreground font-medium">{dest.name}</td>
                  <td className="py-3 px-4 text-right text-muted-foreground">
                    ${(dest.budget || 0).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-right text-muted-foreground">
                    ${(dest.spent || 0).toLocaleString()}
                  </td>
                  <td className="py-3 pl-4 text-right">
                    <span className={cn(
                      'font-medium',
                      (dest.spent || 0) > (dest.budget || 0)
                        ? 'text-destructive'
                        : 'text-forest-500'
                    )}>
                      ${Math.max(0, (dest.budget || 0) - (dest.spent || 0)).toLocaleString()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
