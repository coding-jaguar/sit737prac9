"use client";

import { useEffect, useState } from "react";
import { getUsers, addUser, deleteUser, updateUser } from "@/lib/api";

export default function HomePage() {
  const [users, setUsers] = useState<
    { _id: string; name: string; email: string; age: number }[]
  >([]);
  const [name, setName] = useState("");
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [editingName, setEditingName] = useState("");

  useEffect(() => {
    getUsers().then(setUsers);
  }, []);

  const handleAdd = async () => {
    const user = await addUser({ name, email: `${name}@mail.com`, age: 25 });
    setUsers([...users, user]);
    setName("");
  };

  const handleDelete = async (id: string) => {
    await deleteUser(id);
    setUsers(users.filter((u) => u._id !== id));
  };

  const handleOpenModal = (user: any) => {
    setSelectedUser(user);
    setEditingName(user.name);
  };

  const handleUpdate = async () => {
    if (!selectedUser) return;
    const updated = await updateUser(selectedUser._id, { name: editingName });
    setUsers(users.map((u) => (u._id === updated._id ? updated : u)));
    setSelectedUser(null);
    setEditingName("");
  };

  return (
    <main className="p-4">
      <h1 className="text-xl font-bold">Users</h1>
      <input
        className="border p-2"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name"
      />
      <button className="bg-blue-500 text-white p-2 ml-2" onClick={handleAdd}>
        Add User
      </button>

      <ul className="mt-4">
        {users.map((user) => (
          <li
            key={user._id}
            className="flex justify-between items-center border-b py-2"
          >
            <span
              onClick={() => handleOpenModal(user)}
              className="cursor-pointer hover:underline"
            >
              {user.name}
            </span>
            <button
              className="text-red-500"
              onClick={() => handleDelete(user._id)}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>

      {/* Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-10">
          <div className="bg-white p-6 rounded shadow-lg">
            <h2 className="text-lg font-semibold mb-4 text-black">Edit User</h2>
            <input
              className="border p-2 w-full mb-4 text-black"
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button
                className="bg-gray-300 px-4 py-2 rounded text-black"
                onClick={() => setSelectedUser(null)}
              >
                Cancel
              </button>
              <button
                className="bg-blue-500 text-white px-4 py-2 rounded"
                onClick={handleUpdate}
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
