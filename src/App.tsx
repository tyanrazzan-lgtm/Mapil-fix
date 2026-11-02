import { useEffect, useState, type FormEvent } from "react";

import {
  api,
  apiCustomer,
  getToken,
  setToken,
  clearToken,
  getCustomerToken,
  setCustomerToken,
  clearCustomerToken,
  money,
} from "./api";

type Product = {
  id_produk: number;

  id_kategori: number;

  nama_produk: string;

  deskripsi?: string | null;

  harga: number | string;

  gambar?: string | null;
};

type Category = {
  id_kategori: number;

  nama_kategori: string;
};

type CustomerProfile = {
  id_pelanggan: number;

  nama_pelanggan: string;

  username: string;

  email: string;
};

type CartItem = {
  product: Product;

  quantity: number;
};

const emptyForm = {
  nama_produk: "",

  id_kategori: "",

  deskripsi: "",

  harga: "",

  gambar: "",
};

const fallbackImage = "https://placehold.co/600x750/f0efe8/55554c?text=Wearify";

async function uploadGambar(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("gambar", file);

  const response = await fetch(
    `${import.meta.env.VITE_API_URL || "http://localhost:3000"}/api/upload`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${getToken()}` },
      body: formData,
    },
  );

  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Upload gambar gagal");
  if (!data.gambar) throw new Error("URL gambar Cloudinary tidak ditemukan");
  return data.gambar;
}

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);

  const [categories, setCategories] = useState<Category[]>([]);

  const [search, setSearch] = useState("");

  const [visibleCount, setVisibleCount] = useState(8);

  const [admin, setAdmin] = useState(() => !!getToken());

  const [login, setLogin] = useState(false);

  const [username, setUsername] = useState("");

  const [password, setPassword] = useState("");

  const [editing, setEditing] = useState<number | null>(null);

  const [form, setForm] = useState(emptyForm);

  const [error, setError] = useState("");

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const [cart, setCart] = useState<CartItem[]>([]);

  const [showCart, setShowCart] = useState(false);

  const [showCheckout, setShowCheckout] = useState(false);

  const [customerName, setCustomerName] = useState("");

  const [customerPhone, setCustomerPhone] = useState("");

  const [customerAddress, setCustomerAddress] = useState("");

  const [customerLoggedIn, setCustomerLoggedIn] = useState(
    () => !!getCustomerToken(),
  );

  const [showCustomerAuth, setShowCustomerAuth] = useState(false);

  const [showProfile, setShowProfile] = useState(false);

  const [customerMode, setCustomerMode] = useState<"login" | "register">(
    "login",
  );

  const [customerProfile, setCustomerProfile] =
    useState<CustomerProfile | null>(null);

  const [customerRegisterName, setCustomerRegisterName] = useState("");

  const [customerUsername, setCustomerUsername] = useState("");

  const [customerEmail, setCustomerEmail] = useState("");

  const [customerPassword, setCustomerPassword] = useState("");

  const cartCount = cart.reduce(
    (total, item) => total + item.quantity,

    0,
  );

  const cartTotal = cart.reduce(
    (total, item) => total + Number(item.product.harga) * item.quantity,

    0,
  );

  async function loadData() {
    setLoading(true);

    setError("");

    try {
      const [p, c] = await Promise.all([
        api<any>("/api/produk"),

        api<any>("/api/kategori"),
      ]);

      const productData = Array.isArray(p)
        ? p
        : Array.isArray(p?.data)
          ? p.data
          : Array.isArray(p?.produk)
            ? p.produk
            : [];

      const categoryData = Array.isArray(c)
        ? c
        : Array.isArray(c?.data)
          ? c.data
          : Array.isArray(c?.kategori)
            ? c.kategori
            : [];

      setProducts(productData);

      setCategories(categoryData);
    } catch (err) {
      console.error("Gagal mengambil data:", err);

      setError(
        err instanceof Error ? err.message : "Gagal menghubungkan ke server.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    setVisibleCount(8);
  }, [search]);

  useEffect(() => {
    if (getCustomerToken()) {
      loadCustomerProfile().catch(() => {
        clearCustomerToken();

        setCustomerLoggedIn(false);

        setCustomerProfile(null);
      });
    }
  }, []);

  async function submitLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    try {
      const result = await api<any>("/api/auth/login", {
        method: "POST",

        body: JSON.stringify({ username, password }),
      });

      const token = result?.token ?? result?.data?.token;

      if (!token) {
        throw new Error("Token login tidak ditemukan.");
      }

      setToken(token);

      setAdmin(true);

      setLogin(false);

      setUsername("");

      setPassword("");

      alert("Login berhasil!");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Login gagal.");
    }
  }

  async function loadCustomerProfile() {
    const result = await apiCustomer<any>("/api/pelanggan/profile");

    const profile = result?.data ?? result;

    setCustomerProfile(profile);

    setCustomerLoggedIn(true);
  }

  async function submitCustomerAuth(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    try {
      if (customerMode === "register") {
        await apiCustomer("/api/pelanggan/register", {
          method: "POST",

          body: JSON.stringify({
            nama_pelanggan: customerRegisterName,

            username: customerUsername,

            email: customerEmail,

            password: customerPassword,
          }),
        });

        alert("Register berhasil! Silakan login.");

        setCustomerMode("login");

        setCustomerPassword("");

        return;
      }

      const result = await apiCustomer<any>("/api/pelanggan/login", {
        method: "POST",

        body: JSON.stringify({
          username: customerUsername,

          password: customerPassword,
        }),
      });

      const token = result?.token ?? result?.data?.token;

      if (!token) throw new Error("Token pelanggan tidak ditemukan.");

      setCustomerToken(token);

      await loadCustomerProfile();

      setShowCustomerAuth(false);

      setShowProfile(true);

      setCustomerPassword("");

      setCustomerUsername("");

      alert("Login pelanggan berhasil!");
    } catch (err) {
      alert(
        err instanceof Error ? err.message : "Autentikasi pelanggan gagal.",
      );
    }
  }

  function logoutCustomer() {
    clearCustomerToken();

    setCustomerLoggedIn(false);

    setCustomerProfile(null);

    setShowProfile(false);

    alert("Berhasil logout dari akun pelanggan.");
  }

  async function saveProduct(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (saving) return;

    setSaving(true);

    try {
      const payload = {
        ...form,

        id_kategori: Number(form.id_kategori),

        harga: Number(form.harga),

        deskripsi: form.deskripsi.trim() || null,

        gambar: form.gambar.trim() || null,
      };

      await api(
        editing !== null ? `/api/produk/${editing}` : "/api/produk",

        {
          method: editing !== null ? "PUT" : "POST",

          body: JSON.stringify(payload),
        },
      );

      setForm({ ...emptyForm });

      setEditing(null);

      setVisibleCount((count) => Math.max(count, products.length + 1));

      await loadData();

      alert(
        editing !== null
          ? "Produk berhasil diperbarui."
          : "Produk berhasil ditambahkan.",
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menyimpan produk.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct(id: number) {
    if (!confirm("Yakin ingin menghapus produk ini?")) return;

    try {
      await api(`/api/produk/${id}`, {
        method: "DELETE",
      });

      setProducts((current) =>
        current.filter((product) => product.id_produk !== id),
      );

      setCart((current) =>
        current.filter((item) => item.product.id_produk !== id),
      );

      if (selectedProduct?.id_produk === id) {
        setSelectedProduct(null);
      }

      if (editing === id) {
        setEditing(null);

        setForm({ ...emptyForm });
      }

      alert("Produk berhasil dihapus.");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menghapus produk.");
    }
  }

  function startEdit(product: Product) {
    setEditing(product.id_produk);

    setForm({
      nama_produk: product.nama_produk,

      id_kategori: String(product.id_kategori),

      deskripsi: product.deskripsi || "",

      harga: String(product.harga),

      gambar: product.gambar || "",
    });

    document

      .getElementById("admin-panel")

      ?.scrollIntoView({ behavior: "smooth" });
  }

  function cancelEdit() {
    setEditing(null);

    setForm({ ...emptyForm });
  }

  function logout() {
    clearToken();

    setAdmin(false);

    cancelEdit();
  }

  function addToCart(product: Product) {
    setCart((current) => {
      const existing = current.find(
        (item) => item.product.id_produk === product.id_produk,
      );

      if (existing) {
        return current.map((item) =>
          item.product.id_produk === product.id_produk
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }

      return [...current, { product, quantity: 1 }];
    });

    setSelectedProduct(null);

    alert("Produk berhasil ditambahkan ke keranjang!");
  }

  function changeQuantity(id: number, amount: number) {
    setCart((current) =>
      current

        .map((item) =>
          item.product.id_produk === id
            ? { ...item, quantity: item.quantity + amount }
            : item,
        )

        .filter((item) => item.quantity > 0),
    );
  }

  function buyNow(product: Product) {
    setCart([{ product, quantity: 1 }]);

    setSelectedProduct(null);

    setShowCart(true);
  }

  function submitCheckout(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (cart.length === 0) {
      alert("Keranjang belanja masih kosong.");

      return;
    }

    alert(
      "Data checkout berhasil diisi. Pesanan belum tersimpan karena API checkout dan pembayaran belum dibuat.",
    );
  }

  const visible = products.filter((product) =>
    product.nama_produk

      .toLowerCase()

      .includes(search.trim().toLowerCase()),
  );

  const displayedProducts = visible.slice(0, visibleCount);

  return (
    <div className="app">
      <div className="announcement">
        <span>WEAR YOUR OWN STORY</span>

        <p>Everyday essentials, thoughtfully selected.</p>

        <span>DISCOVER YOUR STYLE ↗</span>
      </div>

      <header className="site-header">
        <a href="#home" className="brand">
          wearify<span>.</span>
        </a>

        <nav className="desktop-nav">
          <a href="#home">Home</a>

          <a href="#produk">Koleksi</a>

          <a href="#about">Tentang Kami</a>
        </nav>

        <div className="header-actions">
          <label className="search-field">
            <span aria-hidden="true">⌕</span>

            <input
              type="search"
              placeholder="Cari produk..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Cari produk"
            />
          </label>

          <button
            type="button"
            className="btn btn-outline cart-entry"
            onClick={() => setShowCart(true)}
          >
            ♧ Keranjang ({cartCount})
          </button>

          <button
            type="button"
            className="btn btn-dark admin-entry"
            onClick={() => setLogin(true)}
          >
            Admin ↗
          </button>

          {customerLoggedIn ? (
            <>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  setShowProfile(true);

                  loadCustomerProfile().catch((err) =>
                    alert(
                      err instanceof Error
                        ? err.message
                        : "Gagal memuat profil",
                    ),
                  );
                }}
              >
                Profil Saya
              </button>

              <button
                type="button"
                className="btn btn-outline"
                onClick={logoutCustomer}
              >
                Logout User
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  setCustomerMode("login");

                  setShowCustomerAuth(true);
                }}
              >
                Login
              </button>

              <button
                type="button"
                className="btn btn-dark"
                onClick={() => {
                  setCustomerMode("register");

                  setShowCustomerAuth(true);
                }}
              >
                Daftar
              </button>
            </>
          )}
        </div>
      </header>

      <main>
        <section className="hero" id="home">
          <div className="hero-copy">
            <p className="eyebrow">01 / EVERYDAY FASHION</p>

            <h1>
              Wear your
              <br />
              own <span>story.</span>
            </h1>

            <p className="hero-desc">
              Temukan gaya favoritmu bersama Wearify. Pilihan fashion untuk
              menemani setiap cerita.
            </p>

            <a className="btn btn-dark hero-button" href="#produk">
              Lihat koleksi <span>↘</span>
            </a>

            <div className="hero-foot">
              <span>ESSENTIALS FOR EVERY DAY</span>

              <span>EST. 2026</span>
            </div>
          </div>

          <div className="hero-image">
            <img
              src="https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=85"
              alt="Inspirasi gaya fashion sehari-hari"
            />

            <div className="image-caption">
              <span>THE EVERYDAY EDIT</span>

              <span>COLLECTION Nº 01</span>
            </div>
          </div>
        </section>

        <section className="value-strip">
          <div>
            <span>01</span>

            <b>Everyday essentials</b>

            <small>Gaya untuk setiap hari</small>
          </div>

          <div>
            <span>02</span>

            <b>Curated for you</b>

            <small>Pilihan yang lebih personal</small>
          </div>

          <div>
            <span>03</span>

            <b>Your own story</b>

            <small>Ekspresikan gaya sendiri</small>
          </div>
        </section>

        <section className="shop-section" id="produk">
          <div className="section-heading">
            <div>
              <p className="eyebrow">THE WEARIFY SELECTION</p>

              <h2>
                Temukan gayamu<span>.</span>
              </h2>

              <p className="section-desc">
                Koleksi pilihan untuk melengkapi keseharianmu.
              </p>
            </div>

            <div className="product-count">{visible.length} PRODUK</div>
          </div>

          <div className="filter-row">
            <span className="filter-chip active">
              {search ? "Hasil pencarian" : "Semua produk"}
            </span>

            <span className="filter-note">
              {search ? `Pencarian: ${search}` : "MADE FOR EVERY DAY"}
            </span>
          </div>

          {error && (
            <div className="notice">
              <strong>Data belum dapat dimuat.</strong>

              <p>{error}</p>

              <button
                type="button"
                className="btn btn-dark"
                onClick={() => void loadData()}
              >
                Coba lagi
              </button>
            </div>
          )}

          {loading ? (
            <div className="empty-state">Memuat koleksi produk...</div>
          ) : visible.length === 0 ? (
            <div className="empty-state">
              {search
                ? "Produk yang kamu cari tidak ditemukan."
                : "Belum ada produk. Tambahkan melalui admin."}
            </div>
          ) : (
            <>
              <div className="product-grid">
                {displayedProducts.map((product, index) => (
                  <article className="product-card" key={product.id_produk}>
                    <div className="product-image">
                      <img
                        src={product.gambar || fallbackImage}
                        alt={product.nama_produk}
                        loading="lazy"
                        onError={(e) => {
                          const img = e.currentTarget;

                          if (img.src !== fallbackImage) {
                            img.onerror = null;

                            img.src = fallbackImage;
                          }
                        }}
                      />

                      <span className="product-tag">
                        {String(index + 1).padStart(2, "0")} / WEARIFY
                      </span>
                    </div>

                    <div className="product-meta">
                      <div>
                        <p className="product-category">
                          {categories.find(
                            (category) =>
                              Number(category.id_kategori) ===
                              Number(product.id_kategori),
                          )?.nama_kategori || "EVERYDAY COLLECTION"}
                        </p>

                        <h3>{product.nama_produk}</h3>

                        <p className="product-description">
                          {product.deskripsi || "Fashion untuk keseharian."}
                        </p>
                      </div>

                      <strong>{money(product.harga)}</strong>
                    </div>

                    <button
                      type="button"
                      className="btn btn-outline detail-button"
                      onClick={() => setSelectedProduct(product)}
                    >
                      Lihat Detail ↗
                    </button>

                    {admin && (
                      <div className="actions">
                        <button
                          type="button"
                          className="btn btn-outline"
                          onClick={() => startEdit(product)}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className="btn btn-danger"
                          onClick={() => void deleteProduct(product.id_produk)}
                        >
                          Hapus
                        </button>
                      </div>
                    )}
                  </article>
                ))}
              </div>

              {visibleCount < visible.length && (
                <div className="load-more">
                  <p>
                    Menampilkan {displayedProducts.length} dari {visible.length}{" "}
                    produk
                  </p>

                  <button
                    type="button"
                    className="btn btn-dark"
                    onClick={() => setVisibleCount((count) => count + 8)}
                  >
                    Lihat lebih banyak ↘
                  </button>
                </div>
              )}

              {visibleCount >= visible.length && visible.length > 8 && (
                <div className="load-more">
                  <p>Semua produk sudah ditampilkan.</p>

                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => {
                      setVisibleCount(8);

                      document

                        .getElementById("produk")

                        ?.scrollIntoView({ behavior: "smooth" });
                    }}
                  >
                    Tampilkan lebih sedikit ↑
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        <section className="story-section" id="about">
          <div className="story-image">
            <img
              src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1000&q=85"
              alt="Suasana butik fashion"
              loading="lazy"
            />
          </div>

          <div className="story-copy">
            <p className="eyebrow">A LITTLE ABOUT WEARIFY</p>

            <h2>Style that feels like you.</h2>

            <p>
              Kami percaya bahwa gaya bukan sekadar apa yang kamu pakai, tetapi
              juga cara kamu mengekspresikan diri. Temukan pilihan yang terasa
              nyaman dan mencerminkan ceritamu.
            </p>

            <a href="#produk" className="story-link">
              Explore the collection ↗
            </a>

            <div className="story-signature">
              wearify<span>.</span>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <a href="#home" className="brand">
          wearify<span>.</span>
        </a>

        <p>Everyday fashion. Your own story.</p>

        <div>
          <a href="#home">Home</a>

          <a href="#produk">Koleksi</a>

          <a href="#about">Tentang</a>
        </div>

        <small>© 2026 Wearify. Everyday fashion, thoughtfully selected.</small>
      </footer>

      {admin && (
        <section className="admin-panel" id="admin-panel">
          <div className="admin-heading">
            <div>
              <p className="eyebrow">MANAGE YOUR STORE</p>

              <h2>
                Dashboard Admin<span>.</span>
              </h2>
            </div>

            <button type="button" className="btn btn-outline" onClick={logout}>
              Logout
            </button>
          </div>

          <form className="product-form" onSubmit={saveProduct}>
            <h3>{editing !== null ? "Edit Produk" : "Tambah Produk Baru"}</h3>

            <label>
              Nama produk
              <input
                placeholder="Contoh: Basic Cotton Shirt"
                value={form.nama_produk}
                onChange={(e) =>
                  setForm({
                    ...form,

                    nama_produk: e.target.value,
                  })
                }
                required
              />
            </label>

            <label>
              Kategori
              <select
                value={form.id_kategori}
                onChange={(e) =>
                  setForm({
                    ...form,

                    id_kategori: e.target.value,
                  })
                }
                required
              >
                <option value="">Pilih kategori</option>

                {categories.map((category) => (
                  <option
                    key={category.id_kategori}
                    value={String(category.id_kategori)}
                  >
                    {category.nama_kategori}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Harga (Rupiah)
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="150000"
                value={form.harga}
                onChange={(e) =>
                  setForm({
                    ...form,

                    harga: e.target.value,
                  })
                }
                required
              />
            </label>

            <label>
              Upload gambar produk ke Cloudinary
              <input
                type="file"
                accept="image/*"
                disabled={uploadingImage}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;

                  if (file.size > 5 * 1024 * 1024) {
                    alert("Ukuran gambar maksimal 5 MB.");
                    e.target.value = "";
                    return;
                  }

                  setUploadingImage(true);
                  try {
                    const url = await uploadGambar(file);
                    setForm((current) => ({ ...current, gambar: url }));
                    alert("Gambar berhasil diupload!");
                  } catch (err) {
                    alert(
                      err instanceof Error
                        ? err.message
                        : "Upload gambar gagal.",
                    );
                  } finally {
                    setUploadingImage(false);
                    e.target.value = "";
                  }
                }}
              />
              <small>
                {uploadingImage
                  ? "Sedang mengupload gambar..."
                  : "Pilih gambar maksimal 5 MB. URL otomatis terisi setelah upload."}
              </small>
            </label>

            <label>
              URL gambar (opsional)
              <input
                type="url"
                maxLength={255}
                placeholder="https://contoh.com/gambar.jpg"
                value={form.gambar}
                onChange={(e) => setForm({ ...form, gambar: e.target.value })}
              />
              <small>URL Cloudinary akan muncul di sini setelah upload.</small>
            </label>

            {form.gambar.trim() && (
              <div className="image-preview">
                <p>Preview gambar</p>

                <img
                  src={form.gambar}
                  alt="Preview produk"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                  onLoad={(e) => {
                    e.currentTarget.style.display = "block";
                  }}
                />
              </div>
            )}

            <label>
              Deskripsi
              <textarea
                placeholder="Deskripsi produk..."
                rows={4}
                value={form.deskripsi}
                onChange={(e) =>
                  setForm({
                    ...form,

                    deskripsi: e.target.value,
                  })
                }
              />
            </label>

            <div className="form-actions">
              <button
                className="btn btn-dark"
                type="submit"
                disabled={saving || uploadingImage}
              >
                {uploadingImage
                  ? "Mengupload gambar..."
                  : saving
                    ? "Menyimpan..."
                    : editing !== null
                      ? "Simpan Perubahan"
                      : "Tambah Produk"}
              </button>

              {editing !== null && (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={cancelEdit}
                >
                  Batal
                </button>
              )}
            </div>
          </form>
        </section>
      )}

      {login && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setLogin(false);
            }
          }}
        >
          <form className="login-card" onSubmit={submitLogin}>
            <button
              type="button"
              className="modal-close"
              onClick={() => setLogin(false)}
              aria-label="Tutup"
            >
              ×
            </button>

            <p className="eyebrow">WEARIFY / ADMIN</p>

            <h2>
              Welcome back<span>.</span>
            </h2>

            <p className="login-desc">
              Masuk untuk mengelola koleksi produk Wearify.
            </p>

            <label>
              Username
              <input
                autoComplete="username"
                placeholder="Masukkan username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </label>

            <label>
              Password
              <input
                type="password"
                autoComplete="current-password"
                placeholder="Masukkan password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>

            <button className="btn btn-dark login-submit" type="submit">
              Masuk ke dashboard ↗
            </button>
          </form>
        </div>
      )}

      {showCustomerAuth && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCustomerAuth(false);
          }}
        >
          <form className="login-card" onSubmit={submitCustomerAuth}>
            <button
              type="button"
              className="modal-close"
              onClick={() => setShowCustomerAuth(false)}
              aria-label="Tutup"
            >
              ×
            </button>

            <p className="eyebrow">WEARIFY / CUSTOMER</p>

            <h2>
              {customerMode === "login" ? "Login" : "Buat Akun"}

              <span>.</span>
            </h2>

            <p className="login-desc">
              {customerMode === "login"
                ? "Masuk ke akun Wearify kamu."
                : "Daftar untuk membuat akun pelanggan Wearify."}
            </p>

            {customerMode === "register" && (
              <>
                <label>
                  Nama lengkap
                  <input
                    value={customerRegisterName}
                    onChange={(e) => setCustomerRegisterName(e.target.value)}
                    placeholder="Nama lengkap"
                    required
                  />
                </label>

                <label>
                  Email
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="email@contoh.com"
                    required
                  />
                </label>
              </>
            )}

            <label>
              Username
              <input
                autoComplete="username"
                value={customerUsername}
                onChange={(e) => setCustomerUsername(e.target.value)}
                placeholder="Masukkan username"
                required
              />
            </label>

            <label>
              Password
              <input
                type="password"
                autoComplete={
                  customerMode === "login" ? "current-password" : "new-password"
                }
                value={customerPassword}
                onChange={(e) => setCustomerPassword(e.target.value)}
                placeholder="Masukkan password"
                minLength={8}
                required
              />
            </label>

            <button type="submit" className="btn btn-dark login-submit">
              {customerMode === "login" ? "Login ↗" : "Daftar Akun ↗"}
            </button>

            <p className="login-desc">
              {customerMode === "login"
                ? "Belum punya akun? "
                : "Sudah punya akun? "}

              <button
                type="button"
                className="back-button"
                onClick={() =>
                  setCustomerMode(
                    customerMode === "login" ? "register" : "login",
                  )
                }
              >
                {customerMode === "login" ? "Daftar sekarang" : "Login di sini"}
              </button>
            </p>
          </form>
        </div>
      )}

      {showProfile && (
        <div
          className="modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowProfile(false);
          }}
        >
          <div className="login-card">
            <button
              type="button"
              className="modal-close"
              onClick={() => setShowProfile(false)}
              aria-label="Tutup profil"
            >
              ×
            </button>

            <p className="eyebrow">WEARIFY / MY ACCOUNT</p>

            <h2>
              Profil Saya<span>.</span>
            </h2>

            {customerProfile ? (
              <>
                <p>Nama: {customerProfile.nama_pelanggan}</p>

                <p>Username: {customerProfile.username}</p>

                <p>Email: {customerProfile.email}</p>
              </>
            ) : (
              <p>Memuat profil...</p>
            )}

            <button
              type="button"
              className="btn btn-dark login-submit"
              onClick={logoutCustomer}
            >
              Logout
            </button>
          </div>
        </div>
      )}

      {selectedProduct && (
        <div
          className="modal-backdrop detail-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedProduct(null);
            }
          }}
        >
          <div
            className="detail-card"
            role="dialog"
            aria-modal="true"
            aria-label="Detail produk"
          >
            <button
              type="button"
              className="modal-close"
              onClick={() => setSelectedProduct(null)}
              aria-label="Tutup detail"
            >
              ×
            </button>

            <div className="detail-image">
              <img
                src={selectedProduct.gambar || fallbackImage}
                alt={selectedProduct.nama_produk}
                onError={(e) => {
                  e.currentTarget.onerror = null;

                  e.currentTarget.src = fallbackImage;
                }}
              />
            </div>

            <div className="detail-content">
              <p className="eyebrow">WEARIFY / PRODUCT DETAIL</p>

              <p className="product-category">
                {categories.find(
                  (category) =>
                    Number(category.id_kategori) ===
                    Number(selectedProduct.id_kategori),
                )?.nama_kategori || "EVERYDAY COLLECTION"}
              </p>

              <h2>{selectedProduct.nama_produk}</h2>

              <strong className="detail-price">
                {money(selectedProduct.harga)}
              </strong>

              <p className="detail-description">
                {selectedProduct.deskripsi || "Fashion untuk keseharian."}
              </p>

              <div className="purchase-actions">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => addToCart(selectedProduct)}
                >
                  ♧ Tambah ke Keranjang
                </button>

                <button
                  type="button"
                  className="btn btn-dark"
                  onClick={() => buyNow(selectedProduct)}
                >
                  Beli Sekarang ↗
                </button>
              </div>

              <button
                type="button"
                className="back-button"
                onClick={() => setSelectedProduct(null)}
              >
                ← Kembali ke koleksi
              </button>
            </div>
          </div>
        </div>
      )}

      {showCart && (
        <div
          className="modal-backdrop cart-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowCart(false);
            }
          }}
        >
          <div
            className="cart-card"
            role="dialog"
            aria-modal="true"
            aria-label="Keranjang belanja"
          >
            <div className="cart-heading">
              <div>
                <p className="eyebrow">WEARIFY / YOUR SELECTION</p>

                <h2>
                  Keranjang Belanja<span>.</span>
                </h2>
              </div>

              <button
                type="button"
                className="modal-close"
                onClick={() => setShowCart(false)}
                aria-label="Tutup keranjang"
              >
                ×
              </button>
            </div>

            {cart.length === 0 ? (
              <div className="cart-empty">
                <p>Keranjang lu masih kosong.</p>

                <button
                  type="button"
                  className="btn btn-dark"
                  onClick={() => setShowCart(false)}
                >
                  Mulai Belanja
                </button>
              </div>
            ) : (
              <>
                <div className="cart-items">
                  {cart.map((item) => (
                    <div className="cart-item" key={item.product.id_produk}>
                      <img
                        src={item.product.gambar || fallbackImage}
                        alt={item.product.nama_produk}
                        onError={(e) => {
                          e.currentTarget.onerror = null;

                          e.currentTarget.src = fallbackImage;
                        }}
                      />

                      <div className="cart-item-info">
                        <h3>{item.product.nama_produk}</h3>

                        <p>{money(item.product.harga)}</p>

                        <div className="quantity-controls">
                          <button
                            type="button"
                            aria-label="Kurangi jumlah"
                            onClick={() =>
                              changeQuantity(
                                item.product.id_produk,

                                -1,
                              )
                            }
                          >
                            −
                          </button>

                          <span>{item.quantity}</span>

                          <button
                            type="button"
                            aria-label="Tambah jumlah"
                            onClick={() =>
                              changeQuantity(
                                item.product.id_produk,

                                1,
                              )
                            }
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="remove-item"
                        onClick={() =>
                          setCart((current) =>
                            current.filter(
                              (cartItem) =>
                                cartItem.product.id_produk !==
                                item.product.id_produk,
                            ),
                          )
                        }
                      >
                        Hapus
                      </button>
                    </div>
                  ))}
                </div>

                <div className="cart-total">
                  <span>Total belanja</span>

                  <strong>{money(cartTotal)}</strong>
                </div>

                <button
                  type="button"
                  className="btn btn-dark checkout-button"
                  onClick={() => {
                    setShowCart(false);

                    setShowCheckout(true);
                  }}
                >
                  Lanjut Checkout ↗
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {showCheckout && (
        <div
          className="modal-backdrop checkout-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowCheckout(false);
            }
          }}
        >
          <form className="checkout-card" onSubmit={submitCheckout}>
            <button
              type="button"
              className="modal-close"
              onClick={() => setShowCheckout(false)}
              aria-label="Tutup checkout"
            >
              ×
            </button>

            <p className="eyebrow">WEARIFY / CHECKOUT</p>

            <h2>
              Detail Pengiriman<span>.</span>
            </h2>

            <label>
              Nama lengkap
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Nama penerima"
                required
              />
            </label>

            <label>
              Nomor telepon
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Nomor yang bisa dihubungi"
                required
              />
            </label>

            <label>
              Alamat lengkap
              <textarea
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                placeholder="Alamat pengiriman"
                rows={3}
                required
              />
            </label>

            <div className="cart-total">
              <span>Total belanja</span>

              <strong>{money(cartTotal)}</strong>
            </div>

            <button type="submit" className="btn btn-dark checkout-button">
              Konfirmasi Checkout ↗
            </button>

            <p className="checkout-note">
              Checkout ini masih berupa tampilan frontend. Pesanan belum
              disimpan ke database dan pembayaran belum diproses.
            </p>
          </form>
        </div>
      )}
    </div>
  );
}

