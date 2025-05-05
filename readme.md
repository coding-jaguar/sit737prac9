# Express + MongoDB on Kubernetes with Local Next.js Frontend

This project demonstrates how to deploy a MongoDB database and an Express.js API into a Kubernetes cluster using `kind`, while keeping the frontend as a local Next.js app that communicates with the backend through NGINX Ingress.

## Requirements

- Docker
- `kubectl`
- `kind`
- `npm` or `pnpm`
- Docker Hub account (for image pushes)

---

## 1. Setup Kubernetes Cluster Using kind

### 1.1 Create a `kind` cluster

```bash
kind create cluster --name sit737-cluster
```

To confirm the cluster is ready:

```bash
kubectl get nodes
```

---

## 2. Deploy MongoDB

### 2.1 Create Kubernetes Secret

```bash
kubectl create secret generic mongo-secret \
  --from-literal=mongo-root-username=mongouser \
  --from-literal=mongo-root-password=mongopass
```

### 2.2 Apply MongoDB Deployment + PVC + Service

Create a file `mongo-deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mongo
spec:
  replicas: 1
  selector:
    matchLabels:
      app: mongo
  template:
    metadata:
      labels:
        app: mongo
    spec:
      containers:
        - name: mongo
          image: mongo:5
          ports:
            - containerPort: 27017
          env:
            - name: MONGO_INITDB_ROOT_USERNAME
              valueFrom:
                secretKeyRef:
                  name: mongo-secret
                  key: mongo-root-username
            - name: MONGO_INITDB_ROOT_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: mongo-secret
                  key: mongo-root-password
          volumeMounts:
            - name: mongo-storage
              mountPath: /data/db
      volumes:
        - name: mongo-storage
          persistentVolumeClaim:
            claimName: mongo-pvc
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: mongo-pvc
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
---
apiVersion: v1
kind: Service
metadata:
  name: mongo
spec:
  selector:
    app: mongo
  ports:
    - protocol: TCP
      port: 27017
      targetPort: 27017
  type: ClusterIP
```

Apply it:

```bash
kubectl apply -f mongo-deployment.yaml
```

---

## 3. Build and Deploy Express API

### 3.1 Dockerize Express App

Build and push:

```bash
docker build -t your-dockerhub-username/express-mongo-app .
docker push your-dockerhub-username/express-mongo-app
```

### 3.2 Express Deployment YAML

`express-deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: express-app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: express
  template:
    metadata:
      labels:
        app: express
    spec:
      containers:
        - name: express
          image: your-dockerhub-username/express-mongo-app
          ports:
            - containerPort: 3000
          env:
            - name: MONGO_URI
              value: mongodb://mongouser:mongopass@mongo:27017
```

Apply it:

```bash
kubectl apply -f express-deployment.yaml
```

### 3.3 Express Service

`express-service.yaml`:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: express-service
spec:
  selector:
    app: express
  ports:
    - port: 80
      targetPort: 3000
  type: ClusterIP
```

```bash
kubectl apply -f express-service.yaml
```

---

## 4. NGINX Ingress Setup

### 4.1 Install NGINX Ingress

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.10.0/deploy/static/provider/cloud/deploy.yaml
```

Wait until:

```bash
kubectl get pods -n ingress-nginx
```

Shows controller is running.

### 4.2 Ingress Resource

Create `express-ingress.yaml`:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: express-ingress
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /$2
    nginx.ingress.kubernetes.io/use-regex: "true"
spec:
  ingressClassName: nginx
  rules:
    - http:
        paths:
          - path: /api(/|$)(.*)
            pathType: ImplementationSpecific
            backend:
              service:
                name: express-service
                port:
                  number: 80
```

```bash
kubectl apply -f express-ingress.yaml
```

### 4.3 Port Forward the Ingress Controller

```bash
kubectl port-forward -n ingress-nginx service/ingress-nginx-controller 8080:80
```

Now your Express app is accessible at:

```
http://localhost:8080/api
```

---

## 5. Local Next.js Frontend

### 5.1 Create App

```bash
npx create-next-app frontend-app
cd frontend-app
```

### 5.2 Create `lib/api.ts`

```ts
const API_BASE = "http://localhost:8080/api";

export async function getUsers() {
  return fetch(`${API_BASE}/users`).then((res) => res.json());
}

export async function addUser(user) {
  return fetch(`${API_BASE}/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(user),
  }).then((res) => res.json());
}

export async function updateUser(id, user) {
  return fetch(`${API_BASE}/users/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(user),
  }).then((res) => res.json());
}

export async function deleteUser(id) {
  return fetch(`${API_BASE}/users/${id}`, { method: "DELETE" }).then((res) =>
    res.json()
  );
}
```

### 5.3 Replace `app/page.tsx` or `pages/index.tsx`

```tsx
"use client";

import { useState, useEffect } from "react";
import { getUsers, addUser, deleteUser, updateUser } from "@/lib/api";

export default function HomePage() {
  const [users, setUsers] = useState([]);
  const [name, setName] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [editingName, setEditingName] = useState("");

  useEffect(() => {
    getUsers().then(setUsers);
  }, []);

  const handleAdd = async () => {
    const user = await addUser({ name, email: `${name}@mail.com`, age: 25 });
    setUsers([...users, user]);
    setName("");
  };

  const handleDelete = async (id) => {
    await deleteUser(id);
    setUsers(users.filter((u) => u._id !== id));
  };

  const handleUpdate = async () => {
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
          <li key={user._id} className="flex justify-between border-b py-2">
            <span
              onClick={() => {
                setSelectedUser(user);
                setEditingName(user.name);
              }}
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

      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
          <div className="bg-white p-4 rounded">
            <h2>Edit User</h2>
            <input
              className="border p-2"
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
            />
            <div className="mt-2 flex gap-2 justify-end">
              <button onClick={() => setSelectedUser(null)}>Cancel</button>
              <button
                className="bg-blue-500 text-white px-4 py-1"
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
```

### 5.4 Run Frontend

```bash
npm run dev
```

Go to:

```
http://localhost:3000
```

You should be able to:

- View users
- Add users
- Delete users
- Update users via modal
