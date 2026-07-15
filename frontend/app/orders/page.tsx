"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/AuthProvider";
import { api } from "@/lib/api";

interface OrderArtwork {
  id: string;
  title: string;
  imageUrl: string;
}

interface Order {
  id: string;
  artworkId: OrderArtwork | string;
  amount: number;
  status: "pending" | "paid" | "failed";
  createdAt: string;
}

const STATUS_STYLES: Record<Order["status"], string> = {
  paid: "bg-[#6BCB77]/15 text-[#2f7a3c]",
  pending: "bg-[#FFC93C]/20 text-[#8a6a14]",
  failed: "bg-[#FF6B6B]/15 text-[#a93b3b]",
};

export default function OrdersPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }

    void (async () => {
      try {
        const res = await api.get("/payments/my-orders");
        setOrders(res.data.data.orders);
      } catch {
        setOrders([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [authLoading, user, router]);

  if (authLoading || loading) {
    return (
      <main className="mx-auto flex w-full max-w-4xl flex-1 items-center justify-center px-4 py-10">
        <p className="text-sm text-[#6C757D]">Loading your orders...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight text-[#1A1A2E]">My Orders</h1>

      {orders.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-[#E9ECEF] bg-white p-10 text-center text-sm text-[#6C757D]">
          You haven't purchased anything yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {orders.map((order) => {
            const artwork = typeof order.artworkId === "object" ? order.artworkId : null;
            return (
              <li
                key={order.id}
                className="flex items-center gap-4 rounded-2xl border border-[#E9ECEF] bg-white p-4 shadow-sm"
              >
                {artwork ? (
                  <Link href={`/paintings/${artwork.id}`} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[#F1F3F5]">
                    <Image src={artwork.imageUrl} alt={artwork.title} fill sizes="64px" className="object-cover" />
                  </Link>
                ) : null}
                <div className="flex-1">
                  <p className="font-semibold text-[#1A1A2E]">{artwork?.title ?? "Artwork"}</p>
                  <p className="text-xs text-[#6C757D]">{new Date(order.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-[#1A1A2E]">${order.amount}</p>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_STYLES[order.status]}`}>
                    {order.status}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
