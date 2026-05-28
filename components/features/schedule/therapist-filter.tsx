"use client";

type Staff = { id: string; name: string; occupation: string };

type Props = {
  staffs: Staff[];
  currentStaffId: string | null;
  selectedId: string | "all";
  onChange: (id: string | "all") => void;
};

const occupationLabel: Record<string, string> = { pt: "PT", ot: "OT", st: "ST" };

const pillState = (active: boolean) =>
  active
    ? "border-primary bg-primary text-primary-foreground"
    : "border-border bg-card text-muted-foreground hover:border-primary hover:text-foreground";

export default function TherapistFilter({ staffs, currentStaffId, selectedId, onChange }: Props) {
  const sorted = [...staffs].sort((a, b) => {
    if (a.id === currentStaffId) return -1;
    if (b.id === currentStaffId) return 1;
    return 0;
  });

  return (
    <div className="mb-4 flex flex-wrap gap-2">
      <button
        onClick={() => onChange("all")}
        className={`rounded-full border px-3 py-1 text-sm font-medium transition-colors ${pillState(selectedId === "all")}`}
      >
        全員
      </button>
      {sorted.map((staff) => {
        const isMe = staff.id === currentStaffId;
        const isSelected = selectedId === staff.id;
        return (
          <button
            key={staff.id}
            onClick={() => onChange(staff.id)}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition-colors ${pillState(isSelected)}`}
          >
            <span className="text-xs opacity-70">
              {occupationLabel[staff.occupation] ?? staff.occupation}
            </span>
            {staff.name}
            {isMe && <span className="text-[10px] opacity-70">(自分)</span>}
          </button>
        );
      })}
    </div>
  );
}
