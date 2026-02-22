import {
  PoliceDepartmentMarker,
  type PoliceDepartment,
} from "@/components/map/police-department-marker";

type PoliceDepartmentsLayerProps = {
  departments: PoliceDepartment[];
  activeDepartmentId: string | null;
  onDepartmentToggle: (departmentId: string) => void;
};

export function PoliceDepartmentsLayer({
  departments,
  activeDepartmentId,
  onDepartmentToggle,
}: PoliceDepartmentsLayerProps) {
  return (
    <>
      {departments.map((department) => (
        <PoliceDepartmentMarker
          key={department.id}
          department={department}
          isActive={activeDepartmentId === department.id}
          onToggle={onDepartmentToggle}
        />
      ))}
    </>
  );
}
