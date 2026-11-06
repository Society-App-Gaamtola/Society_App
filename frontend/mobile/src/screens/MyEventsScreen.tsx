import { PermissionGate, ScreenPlaceholder } from '../components';

// Placeholder until the My Events screen is designed.
export default function MyEventsScreen() {
  return (
    <PermissionGate permission="events">
      <ScreenPlaceholder title="My Events" leftType="back" rightIcons={[]} />
    </PermissionGate>
  );
}
