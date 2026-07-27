"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { AppScreen } from "@/components/layout/app-screen";
import { LoadingState } from "@/components/common/loading-state";
import { ErrorState } from "@/components/common/error-state";
import { EmptyState } from "@/components/common/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";
import { Search, UserPlus, UserCheck, UserX, Users, Inbox, Swords, Check, X, ShieldOff } from "lucide-react";

interface FriendCard {
  profileId: string;
  displayName: string;
  username: string;
  totalPoints: number;
  league: { code: string; displayName: string };
  titleName: string | null;
}

interface FriendEntry extends FriendCard {
  friendshipId: string;
  since: string;
}

interface IncomingRequest {
  friendshipId: string;
  createdAt: string;
  from: FriendCard;
}

interface OutgoingRequest {
  friendshipId: string;
  createdAt: string;
  to: FriendCard;
}

interface SearchResult extends FriendCard {
  relation: "NONE" | "FRIENDS" | "REQUEST_SENT" | "REQUEST_RECEIVED";
  friendshipId: string | null;
}

interface IncomingChallenge {
  challengeId: string;
  createdAt: string;
  from: FriendCard;
}

interface OutgoingChallenge {
  challengeId: string;
  createdAt: string;
  to: FriendCard;
}

interface IncomingTournamentInvite {
  inviteId: string;
  createdAt: string;
  tournamentId: string;
  leagueName: string;
  from: FriendCard;
}

type Tab = "friends" | "requests" | "battles";

export default function FriendsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("friends");
  const [friends, setFriends] = useState<FriendEntry[] | null>(null);
  const [incoming, setIncoming] = useState<IncomingRequest[] | null>(null);
  const [outgoing, setOutgoing] = useState<OutgoingRequest[] | null>(null);
  const [incomingChallenges, setIncomingChallenges] = useState<IncomingChallenge[] | null>(null);
  const [outgoingChallenges, setOutgoingChallenges] = useState<OutgoingChallenge[] | null>(null);
  const [tournamentInvites, setTournamentInvites] = useState<IncomingTournamentInvite[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState<string | null>(null);

  async function loadAll() {
    setError(null);
    try {
      const [friendList, requests, challenges, invites] = await Promise.all([
        apiClient.get<FriendEntry[]>("/api/friends"),
        apiClient.get<{ incoming: IncomingRequest[]; outgoing: OutgoingRequest[] }>("/api/friends/requests"),
        apiClient.get<{ incoming: IncomingChallenge[]; outgoing: OutgoingChallenge[] }>("/api/friends/challenges"),
        apiClient.get<IncomingTournamentInvite[]>("/api/tournaments/invites"),
      ]);
      setFriends(friendList);
      setIncoming(requests.incoming);
      setOutgoing(requests.outgoing);
      setIncomingChallenges(challenges.incoming);
      setOutgoingChallenges(challenges.outgoing);
      setTournamentInvites(invites);
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "読み込みに失敗しました。");
    }
  }

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get<FriendEntry[]>("/api/friends")
      .then((friendList) => !cancelled && setFriends(friendList))
      .catch((e) => !cancelled && setError(e instanceof ApiClientError ? e.message : "読み込みに失敗しました。"));
    apiClient
      .get<{ incoming: IncomingRequest[]; outgoing: OutgoingRequest[] }>("/api/friends/requests")
      .then((requests) => {
        if (cancelled) return;
        setIncoming(requests.incoming);
        setOutgoing(requests.outgoing);
      })
      .catch((e) => !cancelled && setError(e instanceof ApiClientError ? e.message : "読み込みに失敗しました。"));
    apiClient
      .get<{ incoming: IncomingChallenge[]; outgoing: OutgoingChallenge[] }>("/api/friends/challenges")
      .then((challenges) => {
        if (cancelled) return;
        setIncomingChallenges(challenges.incoming);
        setOutgoingChallenges(challenges.outgoing);
      })
      .catch((e) => !cancelled && setError(e instanceof ApiClientError ? e.message : "読み込みに失敗しました。"));
    apiClient
      .get<IncomingTournamentInvite[]>("/api/tournaments/invites")
      .then((invites) => !cancelled && setTournamentInvites(invites))
      .catch((e) => !cancelled && setError(e instanceof ApiClientError ? e.message : "読み込みに失敗しました。"));
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSearch() {
    const username = query.trim();
    if (!username) return;
    setSearching(true);
    setSearchError(null);
    setSearchResult(null);
    try {
      const result = await apiClient.get<SearchResult>(`/api/friends/search?username=${encodeURIComponent(username)}`);
      setSearchResult(result);
    } catch (e) {
      setSearchError(e instanceof ApiClientError ? e.message : "検索に失敗しました。");
    } finally {
      setSearching(false);
    }
  }

  async function sendRequest(username: string) {
    // Keyed on profileId (matching SearchActionButton's `pending` check below) rather than the
    // searched username, so the button actually disables while the request is in flight instead
    // of comparing against a value that can never match and always reading as "not pending".
    setActionPending(searchResult?.profileId ?? username);
    try {
      await apiClient.post("/api/friends/requests", { username });
      setSearchResult((prev) => (prev ? { ...prev, relation: "REQUEST_SENT" } : prev));
      await loadAll();
    } catch (e) {
      setSearchError(e instanceof ApiClientError ? e.message : "申請の送信に失敗しました。");
    } finally {
      setActionPending(null);
    }
  }

  async function acceptRequest(friendshipId: string) {
    setActionPending(friendshipId);
    try {
      await apiClient.post(`/api/friends/requests/${friendshipId}/accept`);
      await loadAll();
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "承認に失敗しました。");
    } finally {
      setActionPending(null);
    }
  }

  async function removeFriendship(friendshipId: string) {
    setActionPending(friendshipId);
    try {
      await apiClient.delete(`/api/friends/${friendshipId}`);
      await loadAll();
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "操作に失敗しました。");
    } finally {
      setActionPending(null);
    }
  }

  async function handleBlock(profileId: string) {
    if (!window.confirm("このユーザーをブロックしますか？フレンドの場合は解除され、今後お互いに申請や対戦の申し込みができなくなります。")) return;
    const reason = window.prompt("ブロック理由（任意・空欄のままでも構いません）") ?? undefined;
    setActionPending(profileId);
    try {
      await apiClient.post("/api/friends/blocked", { profileId, reason: reason || undefined });
      setSearchResult(null);
      await loadAll();
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "ブロックに失敗しました。");
    } finally {
      setActionPending(null);
    }
  }

  async function sendChallenge(profileId: string) {
    setActionPending(profileId);
    try {
      await apiClient.post("/api/friends/challenges", { opponentProfileId: profileId });
      await loadAll();
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "対戦の申し込みに失敗しました。");
    } finally {
      setActionPending(null);
    }
  }

  async function acceptChallenge(challengeId: string) {
    setActionPending(challengeId);
    try {
      const result = await apiClient.post<{ tournamentId: string }>(`/api/friends/challenges/${challengeId}/accept`);
      router.push(`/tournaments/${result.tournamentId}/bracket`);
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "対戦の開始に失敗しました。");
      setActionPending(null);
    }
  }

  async function declineChallenge(challengeId: string) {
    setActionPending(challengeId);
    try {
      await apiClient.delete(`/api/friends/challenges/${challengeId}`);
      await loadAll();
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "操作に失敗しました。");
    } finally {
      setActionPending(null);
    }
  }

  async function acceptTournamentInvite(inviteId: string) {
    setActionPending(inviteId);
    try {
      const result = await apiClient.post<{ tournamentId: string }>(`/api/tournaments/invites/${inviteId}/accept`);
      router.push(`/tournaments/${result.tournamentId}/matchmaking`);
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "参加に失敗しました。");
      setActionPending(null);
    }
  }

  async function declineTournamentInvite(inviteId: string) {
    setActionPending(inviteId);
    try {
      await apiClient.delete(`/api/tournaments/invites/${inviteId}`);
      await loadAll();
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "操作に失敗しました。");
    } finally {
      setActionPending(null);
    }
  }

  const loading =
    friends === null ||
    incoming === null ||
    outgoing === null ||
    incomingChallenges === null ||
    outgoingChallenges === null ||
    tournamentInvites === null;
  const pendingRequestCount = (incoming?.length ?? 0) + (outgoing?.length ?? 0);
  const pendingBattleCount = (incomingChallenges?.length ?? 0) + (outgoingChallenges?.length ?? 0) + (tournamentInvites?.length ?? 0);

  return (
    <AppScreen nav>
      <div className="flex flex-col gap-4 px-4 pb-8 pt-6">
        <header>
          <h1 className="text-lg font-bold text-arena-white">フレンド</h1>
        </header>

        <Card>
          <CardContent className="flex flex-col gap-2 py-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-arena-silver">
              <Search className="h-3.5 w-3.5" />
              ユーザー名でフレンドを追加
            </p>
            <div className="flex gap-2">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="ユーザー名を入力"
                className="flex-1"
              />
              <Button variant="secondary" size="sm" className="shrink-0" onClick={handleSearch} disabled={searching || !query.trim()}>
                検索
              </Button>
            </div>

            {searching && <LoadingState label="検索中…" />}
            {searchError && <p className="text-xs text-arena-danger">{searchError}</p>}
            {searchResult && (
              <div className="flex items-center justify-between rounded-xl border border-arena-border bg-arena-surface-2 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-arena-white">{searchResult.displayName}</p>
                  <p className="truncate text-xs text-arena-silver/70">@{searchResult.username}</p>
                  <p className="truncate text-xs text-arena-silver">{searchResult.league.displayName}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <SearchActionButton
                    result={searchResult}
                    pending={actionPending === (searchResult.profileId ?? "")}
                    onSend={() => sendRequest(query.trim())}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleBlock(searchResult.profileId)}
                    disabled={actionPending === searchResult.profileId}
                    aria-label="ブロック"
                  >
                    <ShieldOff className="h-4 w-4 text-arena-silver/70" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <TabButton active={tab === "friends"} onClick={() => setTab("friends")} icon={Users}>
            フレンド{friends ? ` (${friends.length})` : ""}
          </TabButton>
          <TabButton active={tab === "requests"} onClick={() => setTab("requests")} icon={Inbox}>
            申請{pendingRequestCount > 0 ? ` (${pendingRequestCount})` : ""}
          </TabButton>
          <TabButton active={tab === "battles"} onClick={() => setTab("battles")} icon={Swords}>
            対戦{pendingBattleCount > 0 ? ` (${pendingBattleCount})` : ""}
          </TabButton>
        </div>

        {error && <ErrorState message={error} onRetry={loadAll} />}
        {!error && loading && <LoadingState />}

        {!error && !loading && tab === "friends" && (
          <div className="flex flex-col gap-2">
            {friends!.length === 0 ? (
              <EmptyState icon={Users} title="まだフレンドがいません" description="ユーザー名で検索して申請を送ってみましょう。" />
            ) : (
              friends!.map((friend) => (
                <Card key={friend.friendshipId}>
                  <CardContent className="flex items-center justify-between py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-arena-white">{friend.displayName}</p>
                      <p className="truncate text-xs text-arena-silver/70">@{friend.username}</p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <Badge variant="primary">{friend.league.displayName}</Badge>
                        {friend.titleName && <Badge variant="gold">{friend.titleName}</Badge>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => sendChallenge(friend.profileId)}
                        disabled={actionPending === friend.profileId}
                      >
                        <Swords className="h-3.5 w-3.5" />
                        対戦
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFriendship(friend.friendshipId)}
                        disabled={actionPending === friend.friendshipId}
                        aria-label="フレンド解除"
                      >
                        <UserX className="h-4 w-4 text-arena-danger" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleBlock(friend.profileId)}
                        disabled={actionPending === friend.profileId}
                        aria-label="ブロック"
                      >
                        <ShieldOff className="h-4 w-4 text-arena-silver/70" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {!error && !loading && tab === "requests" && (
          <div className="flex flex-col gap-4">
            <section className="flex flex-col gap-2">
              <h2 className="text-xs font-semibold text-arena-silver">受け取った申請</h2>
              {incoming!.length === 0 ? (
                <EmptyState title="受け取った申請はありません" />
              ) : (
                incoming!.map((req) => (
                  <Card key={req.friendshipId}>
                    <CardContent className="flex items-center justify-between py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-arena-white">{req.from.displayName}</p>
                        <p className="truncate text-xs text-arena-silver/70">@{req.from.username}</p>
                        <Badge variant="primary" className="mt-1">
                          {req.from.league.displayName}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => acceptRequest(req.friendshipId)}
                          disabled={actionPending === req.friendshipId}
                        >
                          <UserCheck className="h-3.5 w-3.5" />
                          承認
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFriendship(req.friendshipId)}
                          disabled={actionPending === req.friendshipId}
                          aria-label="拒否"
                        >
                          <UserX className="h-4 w-4 text-arena-danger" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </section>

            <section className="flex flex-col gap-2">
              <h2 className="text-xs font-semibold text-arena-silver">送信した申請</h2>
              {outgoing!.length === 0 ? (
                <EmptyState title="送信した申請はありません" />
              ) : (
                outgoing!.map((req) => (
                  <Card key={req.friendshipId}>
                    <CardContent className="flex items-center justify-between py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-arena-white">{req.to.displayName}</p>
                        <p className="truncate text-xs text-arena-silver/70">@{req.to.username}</p>
                        <Badge variant="neutral" className="mt-1">
                          承認待ち
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFriendship(req.friendshipId)}
                        disabled={actionPending === req.friendshipId}
                      >
                        取り消す
                      </Button>
                    </CardContent>
                  </Card>
                ))
              )}
            </section>
          </div>
        )}

        {!error && !loading && tab === "battles" && (
          <div className="flex flex-col gap-4">
            <section className="flex flex-col gap-2">
              <h2 className="text-xs font-semibold text-arena-silver">受け取った大会招待</h2>
              {tournamentInvites!.length === 0 ? (
                <EmptyState icon={Users} title="受け取った大会招待はありません" />
              ) : (
                tournamentInvites!.map((invite) => (
                  <Card key={invite.inviteId}>
                    <CardContent className="flex items-center justify-between py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-arena-white">{invite.from.displayName}</p>
                        <p className="truncate text-xs text-arena-silver/70">@{invite.from.username}</p>
                        <Badge variant="primary" className="mt-1">
                          {invite.leagueName}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="gold"
                          size="sm"
                          onClick={() => acceptTournamentInvite(invite.inviteId)}
                          disabled={actionPending === invite.inviteId}
                        >
                          <Check className="h-3.5 w-3.5" />
                          参加
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => declineTournamentInvite(invite.inviteId)}
                          disabled={actionPending === invite.inviteId}
                          aria-label="辞退"
                        >
                          <X className="h-4 w-4 text-arena-danger" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </section>

            <section className="flex flex-col gap-2">
              <h2 className="text-xs font-semibold text-arena-silver">受け取った対戦申し込み</h2>
              {incomingChallenges!.length === 0 ? (
                <EmptyState icon={Swords} title="受け取った対戦申し込みはありません" />
              ) : (
                incomingChallenges!.map((c) => (
                  <Card key={c.challengeId}>
                    <CardContent className="flex items-center justify-between py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-arena-white">{c.from.displayName}</p>
                        <p className="truncate text-xs text-arena-silver/70">@{c.from.username}</p>
                        <Badge variant="primary" className="mt-1">
                          {c.from.league.displayName}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="gold"
                          size="sm"
                          onClick={() => acceptChallenge(c.challengeId)}
                          disabled={actionPending === c.challengeId}
                        >
                          <Check className="h-3.5 w-3.5" />
                          受ける
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => declineChallenge(c.challengeId)}
                          disabled={actionPending === c.challengeId}
                          aria-label="断る"
                        >
                          <X className="h-4 w-4 text-arena-danger" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </section>

            <section className="flex flex-col gap-2">
              <h2 className="text-xs font-semibold text-arena-silver">送信した対戦申し込み</h2>
              {outgoingChallenges!.length === 0 ? (
                <EmptyState title="送信した対戦申し込みはありません" />
              ) : (
                outgoingChallenges!.map((c) => (
                  <Card key={c.challengeId}>
                    <CardContent className="flex items-center justify-between py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-arena-white">{c.to.displayName}</p>
                        <p className="truncate text-xs text-arena-silver/70">@{c.to.username}</p>
                        <Badge variant="neutral" className="mt-1">
                          返答待ち
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => declineChallenge(c.challengeId)}
                        disabled={actionPending === c.challengeId}
                      >
                        取り消す
                      </Button>
                    </CardContent>
                  </Card>
                ))
              )}
            </section>
          </div>
        )}
      </div>
    </AppScreen>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Users;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors",
        active
          ? "border-arena-primary bg-arena-primary/15 text-arena-primary-soft"
          : "border-arena-border text-arena-silver hover:border-arena-silver/40",
      )}
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  );
}

function SearchActionButton({
  result,
  pending,
  onSend,
}: {
  result: SearchResult;
  pending: boolean;
  onSend: () => void;
}) {
  if (result.relation === "FRIENDS") {
    return <Badge variant="success">フレンド</Badge>;
  }
  if (result.relation === "REQUEST_SENT") {
    return <Badge variant="neutral">申請済み</Badge>;
  }
  if (result.relation === "REQUEST_RECEIVED") {
    return <Badge variant="primary">申請を確認</Badge>;
  }
  return (
    <Button variant="primary" size="sm" onClick={onSend} disabled={pending}>
      <UserPlus className="h-3.5 w-3.5" />
      申請
    </Button>
  );
}
