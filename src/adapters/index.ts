// Adapter exports and registration

export { BaseJobAdapter, AdapterRegistry, adapterRegistry } from './base';

// LinkedIn adapter (Europe-wide job search)
export { LinkedInAdapter } from './linkedin-glassdoor';

// Career Pages adapter (Company career pages - Greenhouse, Lever)
export { CareerPagesAdapter } from './career-pages';

// Register adapters
import { adapterRegistry } from './base';
import { LinkedInAdapter } from './linkedin-glassdoor';
import { CareerPagesAdapter } from './career-pages';

// Auto-register adapters on import
adapterRegistry.register(new LinkedInAdapter());
adapterRegistry.register(new CareerPagesAdapter());
