import { useEffect, useState } from "react";

import "./App.css";

import { supabase } from "./supabaseClient";

import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
} from "chart.js";

import { Pie, Line } from "react-chartjs-2";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
);

type Expense = {
  id: number;
  title: string;
  amount: number;
  category: string;
  created_at: string;
};

function App() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Food");
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch expenses from Supabase

  // Task 1
  const fetchExpenses = async () => {
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .order("created_at", { ascending: false });

    console.log("Fetched expenses:", data);
    console.log("Fetch error:", error);

    if (error) {
      console.log("Error fetching data:", error);
    } else {
      setExpenses(data || []);
    }
  };

  useEffect(() => {
    fetchExpenses();

    // Task 8
    const channel = supabase
      .channel("expenses-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "expenses",
        },
        () => {
          fetchExpenses();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Add Expense

  // Task 2
  const addExpense = async () => {
    if (!title || !amount) return;

    const { error } = await supabase.from("expenses").insert([
      {
        title,
        amount: Number(amount),
        category,
      },
    ]);

    if (error) {
      console.log("Error adding expense:", error);
    } else {
      setTitle("");
      setAmount("");
      setCategory("Food");
      fetchExpenses();
    }
  };

  // Task 3
  const deleteExpense = async (id: number) => {
    const { error } = await supabase.from("expenses").delete().eq("id", id);

    if (error) {
      console.log("Error deleting expense:", error);
    } else {
      fetchExpenses();
    }
  };

  // Task 4
  const totalExpenses = expenses.reduce(
    (total, exp) => total + Number(exp.amount),
    0,
  );

  // Task 5
  const categoryTotals = expenses.reduce<Record<string, number>>(
    (totals, exp) => {
      const expenseCategory = exp.category || "Other";
      totals[expenseCategory] =
        (totals[expenseCategory] || 0) + Number(exp.amount);
      return totals;
    },
    {},
  );

  const categoryChartData = {
    labels: Object.keys(categoryTotals),
    datasets: [
      {
        label: "Spending by Category",
        data: Object.values(categoryTotals),
        backgroundColor: [
          "#4caf50",
          "#2196f3",
          "#ff9800",
          "#9c27b0",
          "#f44336",
        ],
        borderWidth: 1,
      },
    ],
  };

  // Task 6
  const monthlyTotals = expenses.reduce<Record<string, number>>(
    (totals, exp) => {
      const date = new Date(exp.created_at);
      const monthYear = date.toLocaleString("default", {
        month: "short",
        year: "numeric",
      });

      totals[monthYear] = (totals[monthYear] || 0) + Number(exp.amount);
      return totals;
    },
    {},
  );

  const sortedMonthlyEntries = Object.entries(monthlyTotals).sort(
    ([monthA], [monthB]) =>
      new Date(monthA).getTime() - new Date(monthB).getTime(),
  );

  const monthlyChartData = {
    labels: sortedMonthlyEntries.map(([month]) => month),
    datasets: [
      {
        label: "Monthly Spending",
        data: sortedMonthlyEntries.map(([, total]) => total),
        borderWidth: 2,
        tension: 0.3,
      },
    ],
  };

  // Task 7
  const filteredExpenses = expenses.filter((exp) =>
    exp.title.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="container">
      <h2>Expense Tracker</h2>

      {/* FORM ROW */}
      <div className="formRow">
        {/* Title */}
        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        {/* Amount */}
        <input
          type="number"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />

        {/* Category Dropdown */}
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="Food">Food</option>
          <option value="Transport">Transport</option>
          <option value="Shopping">Shopping</option>
          <option value="Bills">Bills</option>
          <option value="Other">Other</option>
        </select>

        {/* Button */}
        <button onClick={addExpense}>Add Expense</button>
      </div>

      {/* Task 4 */}
      <div className="totalBox">
        <h3>Total Expenses: ${totalExpenses.toFixed(2)}</h3>
      </div>

      {/* Task 7 */}
      <input
        className="searchInput"
        type="text"
        placeholder="Search by title"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      {/* EXPENSE LIST */}
      <ul>
        {filteredExpenses.map((exp) => (
          <li key={exp.id}>
            <span>
              {exp.title} - ${Number(exp.amount).toFixed(2)} ({exp.category})
            </span>

            {/* Task 3 */}
            <button
              className="deleteButton"
              onClick={() => deleteExpense(exp.id)}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>

      <div className="chartsContainer">
        {/* Task 5 */}
        <div className="chartBox">
          <h3>Category-wise Summary</h3>
          <Pie data={categoryChartData} />
        </div>

        {/* Task 6 */}
        <div className="chartBox">
          <h3>Monthly Spending</h3>
          <Line data={monthlyChartData} />
        </div>
      </div>
    </div>
  );
}

export default App;
