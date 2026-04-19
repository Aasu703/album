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
  const { identity, requestIdentity } = useIdentity();
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

    const resolvedIdentity = identity ?? (await requestIdentity());
    if (!resolvedIdentity) {
      setError("Identity is required to create a party.");
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
        className="w-full space-y-4 rounded-3xl border border-[#E9ECEF] bg-white p-5 shadow-sm"
      >
        <div className="space-y-1">
          <label htmlFor="party-name" className="text-sm font-semibold text-[#1A1A2E]">
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
            className="min-h-12 w-full rounded-2xl border border-[#E9ECEF] bg-white px-4 py-2 text-sm text-[#1A1A2E] outline-none placeholder:text-[#6C757D] transition focus:border-[#4D96FF]"
            placeholder="Sangeet Night"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="party-description" className="text-sm font-semibold text-[#1A1A2E]">
            Description (optional)
          </label>
          <textarea
            id="party-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={MAX_PARTY_DESCRIPTION_LENGTH}
            rows={4}
            className="w-full rounded-2xl border border-[#E9ECEF] bg-white px-4 py-3 text-sm text-[#1A1A2E] outline-none placeholder:text-[#6C757D] transition focus:border-[#4D96FF]"
            placeholder="Share your best moments from tonight!"
          />
        </div>

        {error ? <p className="text-sm text-[#FF6B6B]">{error}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="min-h-12 rounded-full bg-[#4D96FF] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow-md hover:brightness-95 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Creating party..." : "Create Party"}
        </button>
      </form>

      {createdParty ? (
        <section className="space-y-3 rounded-3xl border border-[#6BCB77]/35 bg-[#6BCB77]/15 p-5">
          <h2 className="text-lg font-semibold text-[#2f7a3a]">Party created successfully</h2>
          <p className="text-sm text-[#2f7a3a]">Join code: {createdParty.join_code}</p>
          <p className="break-all text-sm text-[#2f7a3a]">{createdParty.join_url}</p>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/party/${createdParty.join_code}`}
              className="min-h-11 rounded-full bg-[#4D96FF] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:shadow-md hover:brightness-95"
            >
              Open party album
            </Link>
            <button
              type="button"
              onClick={handleDownloadQrCode}
              disabled={!qrCodeDataUrl}
              className="min-h-11 rounded-full border border-[#E9ECEF] bg-white px-4 py-2 text-sm font-semibold text-[#1A1A2E] shadow-sm transition hover:shadow-md disabled:opacity-60"
            >
              Download QR Code
            </button>
          </div>

          {qrCodeDataUrl ? (
            <div className="w-fit rounded-2xl border border-[#6BCB77]/35 bg-white p-3">
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
            <p className="text-sm text-[#6C757D]">Unable to render QR code. You can still share the link above.</p>
          )}
        </section>
      ) : null}
    </section>
  );
}
