import { useMemo, useState } from "react";
import {
  MeshNameInput,
  useNamedPeer,
  useRoster,
  useSharedCollection,
  type MeshConfig,
  type YRoom,
} from "@baditaflorin/mesh-common";

type Props = { room: YRoom | null; config: MeshConfig };
const SKILLS = ["Writing", "Speaking", "Making", "Learning", "Helping"] as const;
type Skill = (typeof SKILLS)[number];

export type Challenge = {
  id: string;
  title: string;
  skill: Skill;
  detail: string;
  createdBy: string;
  createdAt: number;
  completedBy: string[];
};
const idPattern = /^[a-z0-9]{8,40}$/;

/** Accept only compact, display-safe shared challenge records. */
export function isValidChallenge(value: Challenge): boolean {
  return (
    Boolean(value) &&
    idPattern.test(value.id) &&
    typeof value.title === "string" &&
    value.title.trim().length >= 3 &&
    value.title.length <= 80 &&
    SKILLS.includes(value.skill) &&
    typeof value.detail === "string" &&
    value.detail.length <= 220 &&
    typeof value.createdBy === "string" &&
    value.createdBy.trim().length >= 1 &&
    value.createdBy.length <= 32 &&
    Number.isFinite(value.createdAt) &&
    Array.isArray(value.completedBy) &&
    value.completedBy.length <= 100 &&
    value.completedBy.every(
      (person) => typeof person === "string" && person.length >= 1 && person.length <= 32,
    ) &&
    new Set(value.completedBy).size === value.completedBy.length
  );
}

function challengeId() {
  // UUID entropy avoids a collision when offline peers create challenges in
  // the same millisecond; removing separators preserves the collection ID
  // allowlist.
  return crypto.randomUUID().replaceAll("-", "");
}

export function Feature({ room, config }: Props) {
  const { name, setName, myName } = useNamedPeer(config, room);
  const roster = useRoster(room);
  const challenges = useSharedCollection<Challenge>(room, "mesh-skill-challenge:challenges", {
    validate: isValidChallenge,
  });
  const [title, setTitle] = useState("");
  const [skill, setSkill] = useState<Skill>(SKILLS[0]);
  const [detail, setDetail] = useState("");
  const [message, setMessage] = useState("");
  const sorted = useMemo(
    () => [...challenges.items].sort((a, b) => b.createdAt - a.createdAt),
    [challenges.items],
  );
  const ready = myName.trim().length > 0;

  const addChallenge = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanTitle = title.trim();
    const cleanDetail = detail.trim();
    if (!ready) {
      setMessage("Add a display name before sharing a challenge.");
      return;
    }
    if (cleanTitle.length < 3) {
      setMessage("Give the challenge a title of at least 3 characters.");
      return;
    }
    const next = {
      id: challengeId(),
      title: cleanTitle,
      skill,
      detail: cleanDetail,
      createdBy: myName.trim(),
      createdAt: Date.now(),
      completedBy: [],
    };
    // Store a shallow, previously validated value in the shared Y.Array. The
    // collection hook owns observation and reads; this direct transaction
    // makes a just-connected peer's first write deterministic too.
    const added = isValidChallenge(next) && Boolean(room);
    if (added) room!.doc.getArray<Challenge>("mesh-skill-challenge:challenges").push([{ ...next }]);
    if (!added) {
      setMessage("That challenge could not be shared. Please try again.");
      return;
    }
    setTitle("");
    setDetail("");
    setMessage("Challenge shared with this room.");
  };
  const toggleComplete = (challenge: Challenge) => {
    if (!ready) {
      setMessage("Add a display name before marking a challenge complete.");
      return;
    }
    const participant = myName.trim();
    const completedBy = challenge.completedBy.includes(participant)
      ? challenge.completedBy.filter((person) => person !== participant)
      : [...challenge.completedBy, participant];
    challenges.update(challenge.id, { completedBy });
  };

  return (
    <main className="skill-challenge" aria-labelledby="skill-challenge-title">
      <header className="hero">
        <p className="eyebrow">Shared practice, browser to browser</p>
        <h1 id="skill-challenge-title">Skill challenge</h1>
        <p className="lede">Set one small challenge. Try it together. Celebrate every check-in.</p>
        <p className="presence" aria-live="polite">
          {room
            ? `${roster.present.length || 1} participant${roster.present.length === 1 ? "" : "s"} here now`
            : "Connecting to your shared room…"}
        </p>
      </header>
      <section className="challenge-form-panel" aria-labelledby="create-title">
        <div>
          <p className="eyebrow">Create a prompt</p>
          <h2 id="create-title">A challenge worth trying</h2>
        </div>
        <form onSubmit={addChallenge}>
          <label>
            Challenge title
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={80}
              placeholder="Explain your idea in one breath"
              required
            />
          </label>
          <label>
            Skill focus
            <select value={skill} onChange={(event) => setSkill(event.target.value as Skill)}>
              {SKILLS.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </label>
          <label>
            Optional encouragement
            <textarea
              value={detail}
              onChange={(event) => setDetail(event.target.value)}
              maxLength={220}
              rows={3}
              placeholder="Keep it low-stakes and kind."
            />
          </label>
          <button type="submit">Share challenge</button>
        </form>
        <p className="form-message" aria-live="polite">
          {message}
        </p>
      </section>
      <section className="challenge-list-panel" aria-labelledby="shared-challenges-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Shared board</p>
            <h2 id="shared-challenges-title">Challenges in this room</h2>
          </div>
          <span>{sorted.length} total</span>
        </div>
        {sorted.length === 0 ? (
          <p className="empty-state">
            No challenges yet. Add a tiny, specific practice prompt to get the room moving.
          </p>
        ) : (
          <ol className="challenge-list">
            {sorted.map((challenge) => {
              const complete = ready && challenge.completedBy.includes(myName.trim());
              return (
                <li key={challenge.id} className="challenge-card">
                  <div className="challenge-card__body">
                    <span className="skill-tag">{challenge.skill}</span>
                    <h3>{challenge.title}</h3>
                    {challenge.detail && <p>{challenge.detail}</p>}
                    <p className="challenge-meta">
                      Shared by {challenge.createdBy} · {challenge.completedBy.length} completed
                    </p>
                  </div>
                  <button
                    type="button"
                    className={
                      complete ? "complete-button complete-button--done" : "complete-button"
                    }
                    onClick={() => toggleComplete(challenge)}
                    aria-pressed={complete}
                  >
                    {complete ? "Completed — undo" : "I tried it"}
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </section>
      <section className="identity-panel" aria-label="Your identity settings">
        <div>
          <p className="eyebrow">Your local display name</p>
          <p>
            {ready
              ? `${myName} can share and check off challenges.`
              : "Your name is only shared with this room."}
          </p>
        </div>
        <MeshNameInput
          value={name}
          onChange={setName}
          ariaLabel="Your display name"
          placeholder="Your name"
          maxLength={32}
        />
      </section>
      <footer className="privacy-note">
        No accounts, scoring profile, or cloud database. The board syncs directly between browsers
        that join this room.
      </footer>
    </main>
  );
}
