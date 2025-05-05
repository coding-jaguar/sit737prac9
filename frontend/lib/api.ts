const API_BASE = "http://localhost:8080/api"; // Port-forwarded NGINX ingress

type User = {
  name: string;
  email: string;
  age: number;
};

export async function getUsers() {
  const res = await fetch(`${API_BASE}/users`);
  return res.json();
}

export async function addUser(user: User) {
  const res = await fetch(`${API_BASE}/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(user),
  });
  return res.json();
}

export async function updateUser(id: string, data: any) {
  const res = await fetch(`${API_BASE}/users/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function deleteUser(id: string) {
  const res = await fetch(`${API_BASE}/users/${id}`, { method: "DELETE" });
  return res.json();
}
