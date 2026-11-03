import { PermissionGate } from '../components';
import ScreenPlaceholder from '../components/ScreenPlaceholder';

// Placeholder until the My Events screen is designed.
export default function MyEventsScreen() {
  return (
    <PermissionGate permission="events">
      <ScreenPlaceholder title="My Events" leftType="back" rightIcons={[]} />
    </PermissionGate>
  );
}
