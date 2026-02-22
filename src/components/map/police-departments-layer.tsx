import {
  PoliceDepartmentMarker,
  type PoliceDepartment,
} from "@/components/map/police-department-marker";

type PoliceDepartmentsLayerProps = {
  departments: PoliceDepartment[];
};

export function PoliceDepartmentsLayer({ departments }: PoliceDepartmentsLayerProps) {
  return (
    <>
      {departments.map((department) => (
        <PoliceDepartmentMarker key={department.id} department={department} />
      ))}
    </>
  );
}
