import Image from "next/image"
import { ExternalLink } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface Props {
  account: {
    username: string
    name?: string
    biography?: string
    website?: string
    profile_picture_url?: string
    followers_count: number
    follows_count: number
    media_count: number
    last_synced_at?: string
  }
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <p className="text-xl font-semibold tabular-nums font-mono">
        {value >= 1_000_000
          ? `${(value / 1_000_000).toFixed(1)}M`
          : value >= 1_000
          ? `${(value / 1_000).toFixed(1)}K`
          : value.toLocaleString("es-AR")}
      </p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

export function IGAccountHeader({ account }: Props) {
  const syncedAt = account.last_synced_at
    ? new Date(account.last_synced_at).toLocaleString("es-AR", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null

  return (
    <Card className="border-border">
      <CardContent className="p-6">
        <div className="flex items-start gap-5">
          {/* Avatar */}
          <div className="shrink-0">
            {account.profile_picture_url ? (
              <Image
                src={account.profile_picture_url}
                alt={account.username}
                width={72}
                height={72}
                className="rounded-full ring-2 ring-brand/30"
              />
            ) : (
              <div className="w-[72px] h-[72px] rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center">
                <span className="text-2xl font-bold text-brand uppercase">
                  {account.username[0]}
                </span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-lg leading-none">@{account.username}</h3>
              {account.name && (
                <span className="text-sm text-muted-foreground">{account.name}</span>
              )}
              {account.website && (
                <a
                  href={account.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand hover:text-brand/80 inline-flex items-center gap-1 text-xs"
                >
                  <ExternalLink className="w-3 h-3" />
                  {account.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                </a>
              )}
            </div>

            {account.biography && (
              <p className="text-sm text-muted-foreground line-clamp-2">{account.biography}</p>
            )}

            {/* Stats */}
            <div className="flex gap-6 pt-1">
              <StatPill label="Seguidores" value={account.followers_count} />
              <StatPill label="Siguiendo" value={account.follows_count} />
              <StatPill label="Posts" value={account.media_count} />
            </div>
          </div>

          {/* Sync info */}
          {syncedAt && (
            <p className="text-[10px] text-muted-foreground shrink-0 self-start">
              Sync: {syncedAt}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
