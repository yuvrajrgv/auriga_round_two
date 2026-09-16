import { useEffect, useMemo, useState } from "react";

const API_BASE_URL = "/api";

const PAGE_SIZE = 10;

const initialForm = {
  customer_name: "",
  title: "",
  description: "",
  priority: "normal",
  response_deadline: "",
  assigned_to: "",
};

function App() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filter, setFilter] = useState("all");
  const [customerSearch, setCustomerSearch] = useState("");
  const [page, setPage] = useState(1);

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams({
        page: String(page),
        page_size: String(PAGE_SIZE),
      });

      if (filter === "overdue") {
        params.set("overdue", "true");
      }

      if (filter === "my") {
        params.set("assigned_to", "Priya");
      }

      if (customerSearch.trim()) {
        params.set("customer", customerSearch.trim());
      }

      const response = await fetch(
        `${API_BASE_URL}/tickets/?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error("Failed to load tickets.");
      }

      const data = await response.json();
      setTickets(data);
    } catch (err) {
      console.error(err);
      setError(
        "Unable to load tickets. Please make sure the backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [filter, customerSearch, page]);

  const overdueCount = useMemo(() => {
    return tickets.filter(
      (ticket) => new Date(ticket.response_deadline) < new Date()
    ).length;
  }, [tickets]);

  const urgentCount = useMemo(() => {
    return tickets.filter(
      (ticket) => ticket.priority?.toLowerCase() === "urgent"
    ).length;
  }, [tickets]);

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleCreateTicket = async (event) => {
    event.preventDefault();

    try {
      setSubmitting(true);
      setError("");

      const response = await fetch(`${API_BASE_URL}/tickets/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customer_name: form.customer_name.trim(),
          title: form.title.trim(),
          description: form.description.trim(),
          priority: form.priority,
          response_deadline: form.response_deadline,
          assigned_to: form.assigned_to.trim() || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);

        throw new Error(
          errorData?.detail || "Failed to create the ticket."
        );
      }

      setForm(initialForm);
      setShowModal(false);
      setPage(1);

      await fetchTickets();
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const isOverdue = (deadline) => {
    return new Date(deadline) < new Date();
  };

  const getPriorityClass = (ticket) => {
    if (isOverdue(ticket.response_deadline)) {
      return "bg-red-100 text-red-700";
    }

    if (ticket.priority?.toLowerCase() === "urgent") {
      return "bg-orange-100 text-orange-700";
    }

    if (ticket.priority?.toLowerCase() === "high") {
      return "bg-amber-100 text-amber-700";
    }

    return "bg-yellow-100 text-yellow-700";
  };

  const getPriorityLabel = (ticket) => {
    if (isOverdue(ticket.response_deadline)) {
      return "OVERDUE";
    }

    return ticket.priority?.toUpperCase() || "NORMAL";
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString([], {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const changeFilter = (value) => {
    setFilter(value);
    setPage(1);
  };

  const handleSearch = (event) => {
    setCustomerSearch(event.target.value);
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">HelpDesk</h1>
            <p className="mt-1 text-sm text-slate-500">
              Smart ticket prioritization and queue management
            </p>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            + New Ticket
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-6">
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Tickets on Page
            </p>
            <p className="mt-2 text-3xl font-bold">{tickets.length}</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Overdue</p>
            <p className="mt-2 text-3xl font-bold text-red-600">
              {overdueCount}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Urgent</p>
            <p className="mt-2 text-3xl font-bold text-orange-600">
              {urgentCount}
            </p>
          </div>
        </div>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Ticket Queue</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Most pressing tickets appear first
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  value={customerSearch}
                  onChange={handleSearch}
                  placeholder="Search customer..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-100 sm:w-56"
                />

                <select
                  value={filter}
                  onChange={(event) => changeFilter(event.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                >
                  <option value="all">All Tickets</option>
                  <option value="overdue">Overdue</option>
                  <option value="my">My Tickets</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex gap-2 border-b border-slate-200 px-5 py-3">
            {[
              { value: "all", label: "All" },
              { value: "overdue", label: "Overdue" },
              { value: "my", label: "My Tickets" },
            ].map((item) => (
              <button
                key={item.value}
                onClick={() => changeFilter(item.value)}
                className={`rounded-lg px-3 py-2 text-sm font-medium ${
                  filter === item.value
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {error && (
            <div className="mx-5 mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="p-12 text-center text-sm text-slate-500">
              Loading tickets...
            </div>
          ) : tickets.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-lg font-medium text-slate-700">
                No tickets found
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Create a ticket or change your current filter.
              </p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-slate-200">
                {tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="p-5 transition hover:bg-slate-50"
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getPriorityClass(
                              ticket
                            )}`}
                          >
                            {getPriorityLabel(ticket)}
                          </span>

                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium capitalize text-slate-600">
                            {ticket.status}
                          </span>

                          <span className="text-xs text-slate-400">
                            #{ticket.id}
                          </span>
                        </div>

                        <h3 className="text-base font-semibold">
                          {ticket.title}
                        </h3>

                        <p className="mt-1 text-sm text-slate-500">
                          {ticket.customer_name}
                        </p>

                        <p className="mt-2 line-clamp-2 text-sm text-slate-600">
                          {ticket.description}
                        </p>
                      </div>

                      <div className="min-w-56 text-sm lg:text-right">
                        <p className="text-slate-500">Assigned to</p>
                        <p className="font-medium">
                          {ticket.assigned_to || "Unassigned"}
                        </p>

                        <p className="mt-3 text-slate-500">
                          Response deadline
                        </p>

                        <p
                          className={`font-medium ${
                            isOverdue(ticket.response_deadline)
                              ? "text-red-600"
                              : "text-slate-800"
                          }`}
                        >
                          {formatDate(ticket.response_deadline)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4">
                <p className="text-sm text-slate-500">Page {page}</p>

                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setPage((current) => Math.max(1, current - 1))
                    }
                    disabled={page === 1 || loading}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Previous
                  </button>

                  <button
                    onClick={() => setPage((current) => current + 1)}
                    disabled={tickets.length < PAGE_SIZE || loading}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </main>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold">Create New Ticket</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Add a new request to the helpdesk queue.
                </p>
              </div>

              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleCreateTicket}
              className="space-y-4 p-6"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Customer Name
                  </label>
                  <input
                    required
                    name="customer_name"
                    value={form.customer_name}
                    onChange={handleFormChange}
                    placeholder="Acme Corp"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Assigned To
                  </label>
                  <input
                    name="assigned_to"
                    value={form.assigned_to}
                    onChange={handleFormChange}
                    placeholder="Priya"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Ticket Title
                </label>
                <input
                  required
                  name="title"
                  value={form.title}
                  onChange={handleFormChange}
                  placeholder="Laptop won't boot"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Description
                </label>
                <textarea
                  required
                  name="description"
                  value={form.description}
                  onChange={handleFormChange}
                  rows="4"
                  placeholder="Describe the issue..."
                  className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Priority
                  </label>
                  <select
                    name="priority"
                    value={form.priority}
                    onChange={handleFormChange}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500"
                  >
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium">
                    Response Deadline
                  </label>
                  <input
                    required
                    type="datetime-local"
                    name="response_deadline"
                    value={form.response_deadline}
                    onChange={handleFormChange}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? "Creating..." : "Create Ticket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;