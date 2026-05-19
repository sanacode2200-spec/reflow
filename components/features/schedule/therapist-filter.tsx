"use client";

type Staff = { id: string; name: string; occupation: string };

type Props = {
  staffs: Staff[];
  currentStaffId: string | null;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
};

const occupationLabel: Record<string, string> = { pt: "PT", ot: "OT", st: "ST" };

export default function TherapistFilter({ staffs, currentStaffId, selectedIds, onChange }: Props) {
  const sorted = [...staffs].sort((a, b) => {
    if (a.id === currentStaffId) return -1;
    if (b.id === currentStaffId) return 1;
    return 0;
  });

  const toggle = (id: string) => {
    if (id === currentStaffId) return;
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((s) => s !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  return (
    <div className="mb-4 flex flex-wrap gap-2">
      {sorted.map((staff) => {
        const isMe = staff.id === currentStaffId;
        const isSelected = selectedIds.includes(staff.id);
        return (
          <button
            key={staff.id}
            onClick={() => toggle(staff.id)}
            disabled={isMe}
            title={isMe ? "自分の予約は常に表示" : undefined}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
              isSelected
                ? "border-[#111] bg-[#111] text-white"
                : "border-[#eaeaea] bg-white text-[#888] hover:border-[#111] hover:text-[#111]"
            } ${isMe ? "cursor-default ring-2 ring-[#0070f3] ring-offset-1" : "cursor-pointer"}`}
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
