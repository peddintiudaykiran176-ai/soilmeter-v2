"use client";

import { useEffect, useState } from "react";

type ManagedUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  role: "super_admin" | "admin" | "user";
};

const roles: ManagedUser["role"][] = ["user", "admin", "super_admin"];

function isManagedUser(value: unknown): value is ManagedUser {
  if (typeof value !== "object" || value === null) return false;
  return (
    "id" in value &&
    typeof value.id === "string" &&
    "name" in value &&
    typeof value.name === "string" &&
    "email" in value &&
    typeof value.email === "string" &&
    "emailVerified" in value &&
    typeof value.emailVerified === "boolean" &&
    "role" in value &&
    typeof value.role === "string" &&
    roles.some((role) => role === value.role)
  );
}

export function AdminUserList({
  canChangeRoles,
  currentUserId,
}: {
  canChangeRoles: boolean;
  currentUserId: string;
}) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadUsers() {
      try {
        const response = await fetch("/api/admin/users");
        if (!response.ok) {
          setError("Unable to load users. Please refresh the page.");
          return;
        }
        const data: unknown = await response.json();
        if (
          typeof data !== "object" ||
          data === null ||
          !("users" in data) ||
          !Array.isArray(data.users) ||
          !data.users.every(isManagedUser)
        ) {
          setError("The user list returned an unexpected response.");
          return;
        }
        setUsers(data.users);
      } catch {
        setError("Unable to load users. Please refresh the page.");
      } finally {
        setLoading(false);
      }
    }

    void loadUsers();
  }, []);

  async function changeRole(userId: string, role: ManagedUser["role"]) {
    setError("");
    setUpdatingId(userId);
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });
      if (!response.ok) {
        setError(response.status === 403 ? "You are not allowed to change roles." : "Unable to update this role.");
        return;
      }
      setUsers((current) =>
        current.map((user) => (user.id === userId ? { ...user, role } : user)),
      );
    } catch {
      setError("Unable to update this role. Please try again.");
    } finally {
      setUpdatingId(null);
    }
  }

  if (loading) {
    return <p className="mt-8 text-sm text-[#627d6b]">Loading users…</p>;
  }

  return (
    <div className="mt-8">
      {error && (
        <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      )}
      <div className="overflow-x-auto rounded-2xl border border-[#e1ece3]">
        <table className="w-full min-w-[620px] border-collapse text-left text-sm">
          <thead className="bg-[#f0fdf4] text-xs uppercase tracking-wide text-[#52715d]">
            <tr>
              <th className="px-4 py-3 font-semibold">User</th>
              <th className="px-4 py-3 font-semibold">Email status</th>
              <th className="px-4 py-3 font-semibold">Role</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e9f0e9]">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-4 py-4">
                  <p className="font-medium text-[#102a43]">{user.name}</p>
                  <p className="mt-1 text-xs text-[#718074]">{user.email}</p>
                </td>
                <td className="px-4 py-4 text-[#52715d]">
                  {user.emailVerified ? "Verified" : "Unverified"}
                </td>
                <td className="px-4 py-4">
                  {canChangeRoles ? (
                    <select
                      value={user.role}
                      disabled={updatingId === user.id || currentUserId === user.id}
                      onChange={(event) => {
                        const role = roles.find(
                          (candidate) => candidate === event.target.value,
                        );
                        if (role) void changeRole(user.id, role);
                      }}
                      className="rounded-lg border border-[#dce8df] bg-white px-3 py-2 text-sm text-[#14532d] disabled:opacity-60"
                      aria-label={`Role for ${user.name}`}
                    >
                      {roles.map((role) => (
                        <option key={role} value={role}>
                          {role.replace("_", " ")}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="capitalize text-[#52715d]">
                      {user.role.replace("_", " ")}
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-[#718074]">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-[#718074]">
        Showing up to 100 accounts. You cannot change your own role; all role
        changes are validated on the server.
      </p>
    </div>
  );
}
