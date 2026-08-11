"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase-browser";
import Wordmark from "../components/Wordmark";
import HamburgerMenu from "../components/HamburgerMenu";

export default function ShopPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [isPremium, setIsPremium] = useState(false);
  const [items, setItems] = useState([]);
  const [menuOpenId, setMenuOpenId] = useState(null);

  async function loadItems() {
    const { data } = await supabase
      .from("shop_items")
      .select(
        `
        id, title, description, price, photo_url, sold, created_at, seller_id,
        profiles ( display_name, city )
      `
      )
      .order("created_at", { ascending: false });
    setItems(data || []);
  }

  useEffect(() => {
    async function init() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        router.push("/login");
        return;
      }
      setUserId(userData.user.id);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("is_premium")
        .eq("id", userData.user.id)
        .single();
      setIsPremium(profileData?.is_premium || false);

      await loadItems();
      setLoading(false);
    }
    init();
  }, []);

  function handleMessageSeller(sellerId) {
    if (!isPremium) {
      router.push("/upgrade");
      return;
    }
    router.push(`/start-conversation/${sellerId}`);
  }

  function handlePostItem() {
    if (!isPremium) {
      router.push("/upgrade");
      return;
    }
    router.push("/create-listing");
  }

  async function toggleSold(item) {
    setMenuOpenId(null);
    await supabase
      .from("shop_items")
      .update({ sold: !item.sold })
      .eq("id", item.id);
    await loadItems();
  }

  async function handleDelete(itemId) {
    setMenuOpenId(null);
    const confirmed = window.confirm("Delete this listing?");
    if (!confirmed) return;
    await supabase.from("shop_items").delete().eq("id", itemId);
    await loadItems();
  }

  return (
    <div className="auth-shell">
      <div className="auth-card" style={{ maxWidth: 460 }}>
        <div className="page-header">
          <HamburgerMenu />
          <Wordmark />
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          <button
            className="btn-primary"
            type="button"
            onClick={handlePostItem}
            style={{ flex: 1 }}
          >
            + List an item
          </button>
          <button
            className="icon-btn"
            type="button"
            onClick={loadItems}
            title="Refresh"
          >
            ↻
          </button>
        </div>

        {!isPremium && (
          <div className="helper-text" style={{ marginBottom: 16 }}>
            Browsing is free for everyone. Listing an item or messaging a
            seller requires Fetch Local+.
          </div>
        )}

        {loading ? (
          <p>Loading shop...</p>
        ) : items.length === 0 ? (
          <p>No items listed yet.</p>
        ) : (
          items.map((item) => {
            const isMine = item.seller_id === userId;
            return (
              <div className="shop-card" key={item.id}>
                {item.sold && <div className="sold-badge">SOLD</div>}
                {item.photo_url && (
                  <img src={item.photo_url} alt={item.title} />
                )}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <div className="shop-card-title">{item.title}</div>
                  {isMine && (
                    <div className="post-menu-wrap">
                      <button
                        type="button"
                        className="post-menu-btn"
                        onClick={() =>
                          setMenuOpenId(
                            menuOpenId === item.id ? null : item.id
                          )
                        }
                      >
                        ⋮
                      </button>
                      {menuOpenId === item.id && (
                        <div className="post-menu-dropdown">
                          <button
                            type="button"
                            onClick={() => toggleSold(item)}
                          >
                            {item.sold ? "Mark unsold" : "Mark sold"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id)}
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {item.price != null && (
                  <div className="shop-card-price">${item.price}</div>
                )}
                <div className="shop-card-seller">
                  {item.profiles?.display_name || "Someone"}
                  {item.profiles?.city ? ` — ${item.profiles.city}` : ""}
                </div>
                {item.description && (
                  <div className="shop-card-desc">{item.description}</div>
                )}
                {!isMine && !item.sold && (
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ padding: "6px 14px", fontSize: 13 }}
                    onClick={() => handleMessageSeller(item.seller_id)}
                  >
                    Message seller
                  </button>
                )}
              </div>
            );
          })
        )}

        <div className="top-nav">
          <a href="/feed">Feed</a>
          <a href="/buddy-finder">Buddy Finder</a>
          <a href="/messages">Messages</a>
        </div>
      </div>
    </div>
  );
}
