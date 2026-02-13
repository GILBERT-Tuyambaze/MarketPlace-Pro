import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import * as Editor from '../lib/editor';

export default function EditorDashboard() {
  const { user, profile } = useAuth();
  const [tab, setTab] = useState<'approvals' | 'claims' | 'messages' | 'products'>('approvals');

  if (!user || !profile || !(Editor.canEditorPerform(profile.role))) {
    return <div className="p-4">Access denied. Editor role required.</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Editor Dashboard</h1>
      
      <div className="flex gap-2 mb-4">
        <button
          className={`px-4 py-2 rounded ${tab === 'approvals' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          onClick={() => setTab('approvals')}
        >
          Approvals
        </button>
        <button
          className={`px-4 py-2 rounded ${tab === 'claims' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          onClick={() => setTab('claims')}
        >
          Claims
        </button>
        <button
          className={`px-4 py-2 rounded ${tab === 'products' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          onClick={() => setTab('products')}
        >
          Products
        </button>
        <button
          className={`px-4 py-2 rounded ${tab === 'messages' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          onClick={() => setTab('messages')}
        >
          Messages
        </button>
      </div>

      {tab === 'approvals' && <ApprovalsTab user={user} />}
      {tab === 'claims' && <ClaimsTab user={user} />}
      {tab === 'products' && <ProductsTab user={user} />}
      {tab === 'messages' && <MessagesTab user={user} />}
    </div>
  );
}

function ApprovalsTab({ user }: { user: any }) {
  const [products, setProducts] = useState<any[]>([]);
  const [sellers, setSellers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      const p = await Editor.fetchPendingProducts();
      const s = await Editor.fetchPendingSellers();
      if (!mounted) return;
      setProducts(p as any[]);
      setSellers(s as any[]);
      setLoading(false);
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div>
      {loading && <div>Loading pending requests...</div>}

      <section className="mb-6">
        <h2 className="text-xl font-semibold">Pending Product Requests</h2>
        {products.length === 0 && <div className="text-sm text-muted-foreground">No pending products.</div>}
        <ul className="space-y-3 mt-3">
          {products.map((p) => (
            <li key={p.id} className="border rounded p-3">
              <div className="flex justify-between">
                <div>
                  <div className="font-medium">{p.title || p.name}</div>
                  <div className="text-sm text-gray-600">Seller: {p.seller_name}</div>
                </div>
                <div className="space-x-2">
                  <ApproveButtons
                    itemId={p.id}
                    type="product"
                    onDone={() => setProducts((cur) => cur.filter((x) => x.id !== p.id))}
                    actorId={user.uid}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Pending Seller Requests</h2>
        {sellers.length === 0 && <div className="text-sm text-muted-foreground">No pending sellers.</div>}
        <ul className="space-y-3 mt-3">
          {sellers.map((s) => (
            <li key={s.id} className="border rounded p-3 flex justify-between">
              <div>
                <div className="font-medium">{s.full_name}</div>
                <div className="text-sm text-gray-600">ID: {s.id}</div>
              </div>
              <div className="space-x-2">
                <ApproveButtons
                  itemId={s.id}
                  type="seller"
                  onDone={() => setSellers((cur) => cur.filter((x) => x.id !== s.id))}
                  actorId={user.uid}
                />
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function ClaimsTab({ user }: { user: any }) {
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function loadClaims(dept: string) {
    setLoading(true);
    const fetched = await Editor.fetchClaimsForDepartment(dept || 'Editor Department');
    setClaims(fetched as any[]);
    setLoading(false);
  }

  useEffect(() => {
    loadClaims('Editor Department');
  }, []);

  async function handleStatusChange(claimId: string, newStatus: string) {
    try {
      await Editor.updateClaimStatus(claimId, newStatus as any, user.uid, 'editor');
      setClaims((cur) => cur.map((c) => (c.id === claimId ? { ...c, status: newStatus } : c)));
    } catch (err) {
      console.error(err);
      alert('Error updating claim status');
    }
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3">Claims for Editor Department</h2>
      {loading && <div>Loading...</div>}
      {claims.length === 0 && <div className="text-sm text-muted-foreground">No claims.</div>}
      <ul className="space-y-3">
        {claims.map((c) => (
          <li key={c.id} className="border rounded p-3">
            <div className="flex justify-between items-start cursor-pointer" onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}>
              <div>
                <div className="font-medium">{c.title}</div>
                <div className="text-sm text-gray-600">From: {c.sender_id}</div>
                <div className="text-sm">Status: <span className={`px-2 py-1 rounded text-white ${c.status === 'resolved' ? 'bg-green-600' : 'bg-yellow-600'}`}>{c.status}</span></div>
              </div>
            </div>
            {expandedId === c.id && (
              <div className="mt-3 pt-3 border-t">
                <div className="text-sm mb-2">{c.description}</div>
                <select
                  value={c.status}
                  onChange={(e) => handleStatusChange(c.id, e.target.value)}
                  className="border px-2 py-1 rounded"
                >
                  <option value="sent">Sent</option>
                  <option value="under_review">Under Review</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function MessagesTab({ user }: { user: any }) {
  const [recipient, setRecipient] = useState('');
  const [isRoleBased, setIsRoleBased] = useState(true);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  async function handleSend() {
    if (!subject || !body || !recipient) {
      alert('Please fill all fields');
      return;
    }
    setSending(true);
    try {
      const recipients = isRoleBased ? [{ role: recipient }] : [{ uid: recipient }];
      await Editor.sendMessage(user.uid, 'editor', recipients, subject, body);
      setSubject('');
      setBody('');
      setRecipient('');
      alert('Message sent!');
    } catch (err) {
      console.error(err);
      alert('Error sending message');
    }
    setSending(false);
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Send Message</h2>
      <label>
        <input type="checkbox" checked={isRoleBased} onChange={(e) => setIsRoleBased(e.target.checked)} />
        &nbsp;Role-based (vs individual user)
      </label>
      <div>
        <label className="block text-sm font-medium">Recipient {isRoleBased ? '(role)' : '(user ID)'}</label>
        <input
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder={isRoleBased ? 'e.g., seller, admin, editor' : 'e.g., user-uid'}
          className="border w-full px-3 py-2 rounded"
        />
      </div>
      <div>
        <label className="block text-sm font-medium">Subject</label>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="border w-full px-3 py-2 rounded"
        />
      </div>
      <div>
        <label className="block text-sm font-medium">Message</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          className="border w-full px-3 py-2 rounded"
        />
      </div>
      <button onClick={handleSend} disabled={sending} className="px-4 py-2 bg-blue-600 text-white rounded">
        Send
      </button>
    </div>
  );
}

function ProductsTab({ user }: { user: any }) {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    description: '',
    price: 0,
    stock: 0,
    category: 'electronics',
    image: 'https://dummyimage.com/300x300/cccccc/969696?text=Product',
  });

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const editorProducts = await Editor.getEditorProducts(user.uid);
        setProducts(editorProducts);
      } catch (error) {
        console.error('Error loading products:', error);
        alert('Failed to load products');
      } finally {
        setLoading(false);
      }
    };
    loadProducts();
  }, [user.uid]);

  const handleAddProduct = async () => {
    if (!formData.name || !formData.title || !formData.price || formData.price <= 0) {
      alert('Please fill in required fields');
      return;
    }

    try {
      await Editor.addEditorProduct(user.uid, formData);
      alert('Product added successfully');
      setFormData({
        name: '',
        title: '',
        description: '',
        price: 0,
        stock: 0,
        category: 'electronics',
        image: 'https://dummyimage.com/300x300/cccccc/969696?text=Product',
      });
      setShowAddForm(false);
      
      // Reload products
      const updated = await Editor.getEditorProducts(user.uid);
      setProducts(updated);
    } catch (error) {
      console.error('Error adding product:', error);
      alert('Failed to add product');
    }
  };

  if (loading) return <div>Loading products...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">My Products ({products.length})</h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className={`px-4 py-2 rounded text-white ${showAddForm ? 'bg-gray-600' : 'bg-blue-600'}`}
        >
          {showAddForm ? 'Cancel' : '+ Add Product'}
        </button>
      </div>

      {showAddForm && (
        <div className="border rounded-lg p-4 bg-gray-50">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium">Product Name *</label>
              <input
                placeholder="e.g., Wireless Headphones"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="border w-full px-3 py-2 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Title *</label>
              <input
                placeholder="e.g., Premium Bluetooth Headphones"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="border w-full px-3 py-2 rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Description</label>
              <textarea
                placeholder="Product details..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="border w-full px-3 py-2 rounded"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="border w-full px-3 py-2 rounded"
                >
                  <option value="electronics">Electronics</option>
                  <option value="fashion">Fashion</option>
                  <option value="home-garden">Home & Garden</option>
                  <option value="sports">Sports</option>
                  <option value="beauty">Beauty</option>
                  <option value="books-media">Books & Media</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium">Price (USD) *</label>
                <input
                  type="number"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                  className="border w-full px-3 py-2 rounded"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium">Stock Quantity</label>
                <input
                  type="number"
                  placeholder="0"
                  min="0"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                  className="border w-full px-3 py-2 rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Image URL</label>
                <input
                  placeholder="https://..."
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  className="border w-full px-3 py-2 rounded"
                />
              </div>
            </div>
          </div>
          <button onClick={handleAddProduct} className="w-full mt-4 px-4 py-2 bg-green-600 text-white rounded">
            Add Product
          </button>
        </div>
      )}

      {products.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No products yet. Add your first product!</p>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {products.map((product) => (
            <div key={product.id} className="border rounded p-3">
              <img src={product.image} alt={product.name} className="w-full h-32 object-cover rounded mb-2" />
              <h3 className="font-semibold text-sm">{product.name}</h3>
              <p className="text-xs text-gray-600 mb-2 line-clamp-1">{product.title}</p>
              <div className="flex justify-between items-center">
                <span className="font-bold">${product.price.toFixed(2)}</span>
                <span className={`text-xs px-2 py-1 rounded ${product.stock > 5 ? 'bg-green-100 text-green-800' : product.stock > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                  Stock: {product.stock}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ApproveButtons({ itemId, type, onDone, actorId }: { itemId: string; type: 'product' | 'seller'; onDone: () => void; actorId: string }) {
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  async function doDecision(status: string) {
    setBusy(true);
    try {
      if (type === 'product') {
        await Editor.setProductRequestStatus(itemId, status as any, actorId, comment || undefined);
      } else {
        await Editor.setSellerRequestStatus(itemId, status === 'approved' ? 'approved' : 'rejected', actorId, comment || undefined);
      }
      onDone();
    } catch (err) {
      console.error(err);
      alert('Error processing decision');
    }
    setBusy(false);
  }

  return (
    <div className="flex items-center">
      <input
        aria-label="Comment"
        placeholder="Optional comment"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        className="border px-2 py-1 mr-2"
      />
      <button className="btn btn-sm bg-green-600 text-white mr-1" disabled={busy} onClick={() => doDecision('approved')}>
        Approve
      </button>
      <button className="btn btn-sm bg-yellow-600 text-white mr-1" disabled={busy} onClick={() => doDecision('needs_revision')}>
        Needs Revision

      </button>
      <button className="btn btn-sm bg-red-600 text-white" disabled={busy} onClick={() => doDecision('rejected')}>
        Reject
      </button>
    </div>
  );
}