"use client";

import QRCode from "qrcode";
import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

import type { ApiResponse, PartyWithJoinUrl } from "@/app/lib/types";
import { useIdentity } from "@/components/IdentityProvider";

const MAX_PARTY_NAME_LENGTH = 100;
const MAX_PARTY_DESCRIPTION_LENGTH = 500;

/** Creates a party, then renders shareable code, link, and QR artifact. */
export default function PartyCreateForm() {
  const { identity } = useIdentity();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [createdParty, setCreatedParty] = useState<PartyWithJoinUrl | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!createdParty?.join_url) {
      setQrCodeDataUrl(null);
      return;
    }

    let active = true;

    void QRCode.toDataURL(createdParty.join_url, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 320,
    })
      .then((value) => {
        if (active) {
          setQrCodeDataUrl(value);
        }
      })
      .catch(() => {
        if (active) {
          setQrCodeDataUrl(null);
        }
      });

    return () => {
      active = false;
    };
  }, [createdParty]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) {
      return;
    }

    if (!identity) {
      setError("Please set your identity first.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/parties", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          description,
          host_id: identity.id,
          host_name: identity.name,
        }),
      });

      const payload = (await response.json()) as ApiResponse<PartyWithJoinUrl>;

      if (!response.ok || payload.error || !payload.data) {
        throw new Error(payload.error ?? "Failed to create party.");
      }

      setCreatedParty(payload.data);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to create party.");
    } finally {
      setLoading(false);
    }
  }

  function handleDownloadQrCode() {
    if (!qrCodeDataUrl || !createdParty) {
      return;
    }

    const anchor = document.createElement("a");
    anchor.href = qrCodeDataUrl;
    anchor.download = `party-${createdParty.join_code}.png`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
  }

  return (
    <section className="space-y-4">
      <form
        onSubmit={handleSubmit}
        className="w-full space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900"
      >
        <div className="space-y-1">
          <label htmlFor="party-name" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Party name
          </label>
          <input
            id="party-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            minLength={2}
            maxLength={MAX_PARTY_NAME_LENGTH}
            className="min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:placeholder:text-gray-500"
            placeholder="Sangeet Night"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="party-description" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Description (optional)
          </label>
          <textarea
            id="party-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={MAX_PARTY_DESCRIPTION_LENGTH}
            rows={4}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-gray-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:placeholder:text-gray-500"
            placeholder="Share your best moments from tonight!"
          />
        </div>

        {error ? <p className="text-sm text-rose-700">{error}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="min-h-11 rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gray-100 dark:text-gray-900"
        >
          {loading ? "Creating party..." : "Create Party"}
        </button>
      </form>

      {createdParty ? (
        <section className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900 dark:bg-emerald-950/40">
          <h2 className="text-lg font-semibold text-emerald-800 dark:text-emerald-200">Party created successfully</h2>
          <p className="text-sm text-emerald-700 dark:text-emerald-300">Join code: {createdParty.join_code}</p>
          <p className="break-all text-sm text-emerald-700 dark:text-emerald-300">{createdParty.join_url}</p>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/party/${createdParty.join_code}`}
              className="min-h-11 rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white"
            >
              Open party album
            </Link>
            <button
              type="button"
              onClick={handleDownloadQrCode}
              disabled={!qrCodeDataUrl}
              className="min-h-11 rounded-full border border-emerald-700 px-4 py-2 text-sm font-semibold text-emerald-800 disabled:opacity-60 dark:text-emerald-200"
            >
              Download QR Code
            </button>
          </div>

          {qrCodeDataUrl ? (
            <div className="w-fit rounded-xl border border-emerald-200 bg-white p-3 dark:border-emerald-900 dark:bg-gray-900">
              <Image
                src={qrCodeDataUrl}
                alt={`QR code for join code ${createdParty.join_code}`}
                width={224}
                height={224}
                unoptimized
                className="h-56 w-56"
              />
            </div>
          ) : (
            <p className="text-sm text-amber-700 dark:text-amber-300">Unable to render QR code. You can still share the link above.</p>
          )}
        </section>
      ) : null}
    </section>
  );
}
