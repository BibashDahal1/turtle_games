"use client";

import { useRef, useState } from "react";
import type { KeyboardEvent } from "react";

import CardShowcase from "@/components/games/CardShowcase";
import RulesShowcase from "@/components/games/RulesShowcase";
import { useGameRules } from "@/hooks/useGameRules";
import type { Game } from "@/lib/games";

type TabId = "cards" | "rules";

export default function GameTabs({ game }: { game: Game }) {
  const rules = useGameRules(game);
  const gameWithRules: Game = { ...game, rules };

  const tabs: { id: TabId; label: string; count: number }[] = [];
  if (game.cards?.length)
    tabs.push({ id: "cards", label: "Cards", count: game.cards.length });
  if (rules.length)
    tabs.push({ id: "rules", label: "Rules", count: rules.length });

  const [active, setActive] = useState<TabId>("cards");
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  if (tabs.length === 0) return null;
  const current = tabs.some((t) => t.id === active) ? active : tabs[0].id;

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const i = tabs.findIndex((t) => t.id === current);
    let next = i;
    if (event.key === "ArrowRight") next = (i + 1) % tabs.length;
    else if (event.key === "ArrowLeft")
      next = (i - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else return;
    event.preventDefault();
    setActive(tabs[next].id);
    buttons.current[next]?.focus();
  }

  const panel =
    current === "cards" ? (
      <CardShowcase game={game} />
    ) : (
      <RulesShowcase game={gameWithRules} />
    );

  return (
    <div className="relative z-10">
      {tabs.length > 1 && (
        <div className="flex justify-center pt-8">
          <div
            role="tablist"
            aria-label={`${game.name} cards and rules`}
            onKeyDown={onKeyDown}
            className="inline-flex gap-1 rounded-full border border-ink/15 bg-page/30 p-1 backdrop-blur-md"
          >
            {tabs.map((tab, i) => {
              const selected = tab.id === current;
              return (
                <button
                  key={tab.id}
                  ref={(el) => {
                    buttons.current[i] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`game-tab-${tab.id}`}
                  aria-selected={selected}
                  aria-controls={`game-panel-${tab.id}`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setActive(tab.id)}
                  className={`rounded-full px-6 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                    selected
                      ? "bg-accent text-page"
                      : "text-ink/80 hover:text-ink"
                  }`}
                >
                  {tab.label}
                  <span className="ml-1.5 text-xs opacity-70">{tab.count}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div
        role="tabpanel"
        id={`game-panel-${current}`}
        aria-labelledby={tabs.length > 1 ? `game-tab-${current}` : undefined}
      >
        {panel}
      </div>
    </div>
  );
}
