const HUBSPOT_API_BASE = 'https://api.hubapi.com';
// Support both token env vars for flexibility
const HUBSPOT_TOKEN = process.env.HUBSPOT_PRIVATE_APP_TOKEN || process.env.HUBSPOT_ACCESS_TOKEN;

interface HubSpotContact {
  id: string;
  properties?: {
    email?: string;
    firstname?: string;
    lastname?: string;
  };
}

export interface ContactData {
  email: string;
  firstname: string;
  lastname: string;
  company?: string;
}

function hasToken() {
  if (!HUBSPOT_TOKEN) {
    console.log('[HubSpot] Token not configured, skipping', {
      hasPrivateToken: !!process.env.HUBSPOT_PRIVATE_APP_TOKEN,
      hasAccessToken: !!process.env.HUBSPOT_ACCESS_TOKEN,
      nodeEnv: process.env.NODE_ENV,
      vercel: process.env.VERCEL,
    });
    return false;
  }
  return true;
}

/**
 * Check if a contact exists in HubSpot by email
 */
async function findContactByEmail(email: string): Promise<HubSpotContact | null> {
  if (!hasToken()) return null;

  try {
    const response = await fetch(`${HUBSPOT_API_BASE}/crm/v3/objects/contacts/search`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${HUBSPOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filterGroups: [
          {
            filters: [
              {
                propertyName: 'email',
                operator: 'EQ',
                value: email,
              },
            ],
          },
        ],
        properties: ['email', 'firstname', 'lastname'],
        limit: 1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[HubSpot] Search failed:', response.status, errorText);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/fbdc8caf-9cc6-403b-83c1-f186ed9b4695',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'hubspot.ts:findContactByEmail:searchFailed',message:'HubSpot search API failed',data:{email,status:response.status,errorText:errorText.substring(0,500)},timestamp:Date.now(),runId:'hubspot-debug',hypothesisId:'H5'})}).catch(()=>{});
      // #endregion
      return null;
    }

    const data: any = await response.json();
    if (data?.results?.length) {
      console.log(`[HubSpot] Found existing contact: ${email}`);
      return data.results[0];
    }

    console.log(`[HubSpot] No existing contact found: ${email}`);
    return null;
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/fbdc8caf-9cc6-403b-83c1-f186ed9b4695',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'hubspot.ts:findContactByEmail:exception',message:'Exception in findContactByEmail',data:{email,errorMessage:error?.message,errorName:error?.name},timestamp:Date.now(),runId:'hubspot-debug',hypothesisId:'H5'})}).catch(()=>{});
    // #endregion
    console.error('[HubSpot] Error searching for contact:', error);
    return null;
  }
}

/**
 * Create a new contact in HubSpot. Returns contact id or null.
 */
async function createContact(contactData: ContactData): Promise<string | null> {
  if (!hasToken()) return null;

  try {
    const response = await fetch(`${HUBSPOT_API_BASE}/crm/v3/objects/contacts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${HUBSPOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          email: contactData.email,
          firstname: contactData.firstname,
          lastname: contactData.lastname,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[HubSpot] Create failed:', response.status, errorText);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/fbdc8caf-9cc6-403b-83c1-f186ed9b4695',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'hubspot.ts:createContact:createFailed',message:'HubSpot create API failed',data:{email:contactData.email,status:response.status,errorText:errorText.substring(0,500)},timestamp:Date.now(),runId:'hubspot-debug',hypothesisId:'H5'})}).catch(()=>{});
      // #endregion
      return null;
    }

    const result: any = await response.json();
    console.log(`[HubSpot] ✅ Contact created: ${contactData.email} (ID: ${result?.id})`);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/fbdc8caf-9cc6-403b-83c1-f186ed9b4695',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'hubspot.ts:createContact:success',message:'Contact created successfully',data:{email:contactData.email,contactId:result?.id},timestamp:Date.now(),runId:'hubspot-debug',hypothesisId:'H5'})}).catch(()=>{});
    // #endregion
    return result?.id ?? null;
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/fbdc8caf-9cc6-403b-83c1-f186ed9b4695',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'hubspot.ts:createContact:exception',message:'Exception in createContact',data:{email:contactData.email,errorMessage:error?.message,errorName:error?.name},timestamp:Date.now(),runId:'hubspot-debug',hypothesisId:'H5'})}).catch(()=>{});
    // #endregion
    console.error('[HubSpot] Error creating contact:', error);
    return null;
  }
}

/**
 * Update an existing contact in HubSpot
 */
async function updateContact(contactId: string, contactData: ContactData): Promise<boolean> {
  if (!hasToken()) return false;

  try {
    const response = await fetch(`${HUBSPOT_API_BASE}/crm/v3/objects/contacts/${contactId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${HUBSPOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          firstname: contactData.firstname,
          lastname: contactData.lastname,
        },
      }),
    });

    if (!response.ok) {
      console.error('[HubSpot] Update failed:', response.status, await response.text());
      return false;
    }

    console.log(`[HubSpot] ✅ Contact updated: ${contactData.email} (ID: ${contactId})`);
    return true;
  } catch (error) {
    console.error('[HubSpot] Error updating contact:', error);
    return false;
  }
}

/**
 * Upsert a contact: create if doesn't exist, update if exists.
 * Returns contact id or null. Non-blocking: never throws.
 */
export async function upsertContact(contactData: ContactData): Promise<string | null> {
  console.log(`[HubSpot] Starting upsert for: ${contactData.email}`, {
    hasToken: !!HUBSPOT_TOKEN,
    tokenLength: HUBSPOT_TOKEN ? HUBSPOT_TOKEN.length : 0,
    nodeEnv: process.env.NODE_ENV,
    vercel: process.env.VERCEL,
  });

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/fbdc8caf-9cc6-403b-83c1-f186ed9b4695',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'hubspot.ts:upsertContact:entry',message:'upsertContact called',data:{email:contactData.email,hasToken:!!HUBSPOT_TOKEN,hasPrivateToken:!!process.env.HUBSPOT_PRIVATE_APP_TOKEN,hasAccessToken:!!process.env.HUBSPOT_ACCESS_TOKEN,nodeEnv:process.env.NODE_ENV,vercel:process.env.VERCEL},timestamp:Date.now(),runId:'hubspot-debug',hypothesisId:'H1'})}).catch(()=>{});
  // #endregion

  if (!hasToken()) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/fbdc8caf-9cc6-403b-83c1-f186ed9b4695',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'hubspot.ts:upsertContact:noToken',message:'No HubSpot token available',data:{hasPrivateToken:!!process.env.HUBSPOT_PRIVATE_APP_TOKEN,hasAccessToken:!!process.env.HUBSPOT_ACCESS_TOKEN},timestamp:Date.now(),runId:'hubspot-debug',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
    return null;
  }

  try {
    const existing = await findContactByEmail(contactData.email);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/fbdc8caf-9cc6-403b-83c1-f186ed9b4695',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'hubspot.ts:upsertContact:afterSearch',message:'Contact search completed',data:{email:contactData.email,foundExisting:!!existing,contactId:existing?.id},timestamp:Date.now(),runId:'hubspot-debug',hypothesisId:'H2'})}).catch(()=>{});
    // #endregion

    if (existing) {
      await updateContact(existing.id, contactData);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/fbdc8caf-9cc6-403b-83c1-f186ed9b4695',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'hubspot.ts:upsertContact:afterUpdate',message:'Contact update completed',data:{email:contactData.email,contactId:existing.id},timestamp:Date.now(),runId:'hubspot-debug',hypothesisId:'H3'})}).catch(()=>{});
      // #endregion
      return existing.id;
    }
    const contactId = await createContact(contactData);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/fbdc8caf-9cc6-403b-83c1-f186ed9b4695',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'hubspot.ts:upsertContact:afterCreate',message:'Contact create completed',data:{email:contactData.email,contactId},timestamp:Date.now(),runId:'hubspot-debug',hypothesisId:'H3'})}).catch(()=>{});
    // #endregion
    return contactId;
  } catch (error: any) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/fbdc8caf-9cc6-403b-83c1-f186ed9b4695',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'hubspot.ts:upsertContact:error',message:'Upsert error caught',data:{email:contactData.email,errorMessage:error?.message,errorName:error?.name,errorStack:error?.stack?.substring(0,500)},timestamp:Date.now(),runId:'hubspot-debug',hypothesisId:'H4'})}).catch(()=>{});
    // #endregion
    console.error('[HubSpot] Upsert failed (non-blocking):', error);
    if (error?.response) {
      console.error('[HubSpot] Response status:', error.response.status);
      console.error('[HubSpot] Response body:', await error.response.text().catch(() => 'Unable to read response'));
    }
    return null;
  }
}

/**
 * Extract domain from email address
 */
function extractDomainFromEmail(email: string): string {
  const parts = email.split('@');
  return parts.length === 2 ? parts[1].toLowerCase() : '';
}

/**
 * Search for a company by EXACT NAME (not domain)
 */
async function findCompanyByName(companyName: string): Promise<{ id: string; properties: any } | null> {
  if (!hasToken()) return null;
  try {
    console.log(`[HubSpot] Searching for company by name: "${companyName}"`);
    const response = await fetch(`${HUBSPOT_API_BASE}/crm/v3/objects/companies/search`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${HUBSPOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filterGroups: [{
          filters: [{ propertyName: 'name', operator: 'EQ', value: companyName }],
        }],
        properties: ['name', 'domain'],
        limit: 1,
      }),
    });
    if (!response.ok) {
      console.error('[HubSpot] Company search failed:', response.status, await response.text());
      return null;
    }
    const data: any = await response.json();
    if (data.results?.length > 0) {
      console.log(`[HubSpot] ✅ Found existing company: "${companyName}" (ID: ${data.results[0].id})`);
      return data.results[0];
    }
    console.log(`[HubSpot] No existing company found for name: "${companyName}"`);
    return null;
  } catch (error: any) {
    console.error('[HubSpot] Error searching for company:', error);
    return null;
  }
}

/**
 * Check if a domain is already used by another company (optionally excluding one company)
 */
async function isDomainUsedByAnotherCompany(
  domain: string,
  excludeCompanyId?: string
): Promise<boolean> {
  if (!hasToken() || !domain) return false;
  try {
    console.log(`[HubSpot] Checking if domain "${domain}" is already in use`);
    const response = await fetch(`${HUBSPOT_API_BASE}/crm/v3/objects/companies/search`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${HUBSPOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filterGroups: [{ filters: [{ propertyName: 'domain', operator: 'EQ', value: domain }] }],
        properties: ['name', 'domain'],
        limit: 10,
      }),
    });
    if (!response.ok) {
      console.error('[HubSpot] Domain check failed:', response.status);
      return false;
    }
    const data: any = await response.json();
    if (data.results?.length > 0) {
      const otherCompanies = data.results.filter((c: any) => c.id !== excludeCompanyId);
      if (otherCompanies.length > 0) {
        const name = otherCompanies[0].properties?.name ?? otherCompanies[0].id;
        console.log(`[HubSpot] ⚠️ Domain "${domain}" is already used by company: ${name} (ID: ${otherCompanies[0].id})`);
        return true;
      }
    }
    console.log(`[HubSpot] ✅ Domain "${domain}" is available`);
    return false;
  } catch (error: any) {
    console.error('[HubSpot] Error checking domain:', error);
    return false;
  }
}

/**
 * Create a new company in HubSpot with the given name ONLY.
 * Company is never created from email domain—only from sign-up form company name.
 * Domain can be added later via addDomainToCompany if needed.
 */
async function createCompany(companyName: string): Promise<{ id: string; properties: any } | null> {
  if (!hasToken()) return null;
  try {
    console.log(`[HubSpot] Creating new company by name only: "${companyName}" (no domain on create)`);
    const properties: Record<string, string> = { name: companyName };
    const response = await fetch(`${HUBSPOT_API_BASE}/crm/v3/objects/companies`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${HUBSPOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ properties }),
    });
    if (!response.ok) {
      console.error('[HubSpot] Company creation failed:', response.status, await response.text());
      return null;
    }
    const result: any = await response.json();
    console.log(`[HubSpot] ✅ Company created: "${companyName}" (ID: ${result.id})`);
    return result;
  } catch (error: any) {
    console.error('[HubSpot] Error creating company:', error);
    return null;
  }
}

/**
 * Update company to add domain if it's available
 */
async function addDomainToCompany(companyId: string, domain: string): Promise<boolean> {
  if (!hasToken() || !domain) return false;
  try {
    const domainInUse = await isDomainUsedByAnotherCompany(domain, companyId);
    if (domainInUse) {
      console.log(`[HubSpot] Cannot add domain "${domain}" to company ${companyId} - already in use`);
      return false;
    }
    console.log(`[HubSpot] Adding domain "${domain}" to company ${companyId}`);
    const response = await fetch(`${HUBSPOT_API_BASE}/crm/v3/objects/companies/${companyId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${HUBSPOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ properties: { domain } }),
    });
    if (!response.ok) {
      console.error('[HubSpot] Failed to add domain:', response.status, await response.text());
      return false;
    }
    console.log(`[HubSpot] ✅ Domain "${domain}" added to company ${companyId}`);
    return true;
  } catch (error: any) {
    console.error('[HubSpot] Error adding domain to company:', error);
    return false;
  }
}

/**
 * Associate a contact with a company.
 * Direction: contact → company. Use type 279 (Contact to company). 280 = Company to contact (wrong direction).
 */
export async function associateContactWithCompany(contactId: string, companyId: string): Promise<boolean> {
  if (!hasToken()) return false;
  const associationTypeId = 279; // Contact to company (279). Company to contact = 280.
  const url = `${HUBSPOT_API_BASE}/crm/v3/objects/contacts/${contactId}/associations/companies/${companyId}/${associationTypeId}`;
  try {
    console.log(`[HubSpot] Associating contact ${contactId} with company ${companyId}`);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/fbdc8caf-9cc6-403b-83c1-f186ed9b4695',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'hubspot.ts:associateContactWithCompany:beforePut',message:'Association request',data:{contactId,companyId,associationTypeId,urlPath:url.replace(HUBSPOT_API_BASE,'')},timestamp:Date.now(),runId:'hubspot-assoc',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
    const response = await fetch(url, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${HUBSPOT_TOKEN}` },
    });
    const responseText = await response.text();
    if (!response.ok) {
      console.error('[HubSpot] Association failed:', response.status, responseText);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/fbdc8caf-9cc6-403b-83c1-f186ed9b4695',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'hubspot.ts:associateContactWithCompany:failed',message:'Association failed',data:{status:response.status,responseText:responseText?.slice(0,500),associationTypeId},timestamp:Date.now(),runId:'hubspot-assoc',hypothesisId:'H1,H2'})}).catch(()=>{});
      // #endregion
      return false;
    }
    console.log(`[HubSpot] ✅ Contact ${contactId} associated with company ${companyId}`);
    return true;
  } catch (error: any) {
    console.error('[HubSpot] Error associating contact with company:', error);
    return false;
  }
}

/**
 * Ensure a company exists by NAME and has the contact's email domain (if safe to add).
 * Does NOT require the contact to exist. Use this BEFORE creating the contact so that
 * when the contact is created, HubSpot's "Create and associate companies with contacts"
 * setting finds our company by domain and does not auto-create a duplicate.
 * Returns company ID or null.
 */
export async function ensureCompanyExistsWithDomain(
  companyName: string,
  contactEmail: string
): Promise<string | null> {
  const trimmed = companyName?.trim() ?? '';
  if (!trimmed || !hasToken()) return null;
  const emailDomain = extractDomainFromEmail(contactEmail);
  try {
    console.log(`[HubSpot] ensureCompanyExistsWithDomain: "${trimmed}" (domain from email: ${emailDomain || '(none)'}) — company BEFORE contact to avoid HubSpot auto-create`);
    let company = await findCompanyByName(trimmed);
    let companyId: string;
    if (company) {
      companyId = company.id;
      const props = company.properties ?? {};
      const currentDomain = typeof props.domain === 'string' ? props.domain : '';
      if (!currentDomain && emailDomain) {
        await addDomainToCompany(companyId, emailDomain);
      }
    } else {
      const newCompany = await createCompany(trimmed);
      if (!newCompany) return null;
      companyId = newCompany.id;
      if (emailDomain) {
        const domainInUse = await isDomainUsedByAnotherCompany(emailDomain, companyId);
        if (!domainInUse) await addDomainToCompany(companyId, emailDomain);
      }
    }
    console.log(`[HubSpot] Company ready before contact create (ID: ${companyId})`);
    return companyId;
  } catch {
    return null;
  }
}

/**
 * Upsert company by NAME and associate contact.
 * Logic: 1) Search by EXACT company name. 2) If exists use it (optionally add domain). 3) If not create with name (and domain if available). 4) Associate contact.
 */
export async function upsertCompanyAndAssociate(
  contactEmail: string,
  companyName: string
): Promise<void> {
  const trimmed = companyName?.trim() ?? '';
  if (!trimmed) {
    console.log('[HubSpot] No company name provided, skipping company upsert');
    return;
  }
  console.log(`[HubSpot] ========================================`);
  console.log(`[HubSpot] Starting company upsert`);
  console.log(`[HubSpot] Company Name: "${trimmed}"`);
  console.log(`[HubSpot] Contact Email: ${contactEmail}`);
  console.log(`[HubSpot] ========================================`);

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/fbdc8caf-9cc6-403b-83c1-f186ed9b4695',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'hubspot.ts:upsertCompanyAndAssociate:entry',message:'Company upsert started',data:{companyNameFromForm:trimmed,contactEmail},timestamp:Date.now(),runId:'hubspot-company',hypothesisId:'H-name-only'})}).catch(()=>{});
  // #endregion

  try {
    const emailDomain = extractDomainFromEmail(contactEmail);
    console.log(`[HubSpot] Extracted domain from email: ${emailDomain || '(none)'}`);

    const existingContact = await findContactByEmail(contactEmail);
    if (!existingContact) {
      console.error('[HubSpot] ❌ Contact not found, cannot proceed with company association');
      return;
    }
    const contactId = existingContact.id;
    console.log(`[HubSpot] Contact found (ID: ${contactId})`);

    let company = await findCompanyByName(trimmed);
    let companyId: string;

    if (company) {
      companyId = company.id;
      console.log(`[HubSpot] Using existing company: "${trimmed}" (ID: ${companyId})`);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/fbdc8caf-9cc6-403b-83c1-f186ed9b4695',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'hubspot.ts:upsertCompanyAndAssociate:foundByName',message:'Using company found by name only',data:{companyNameFromForm:trimmed,companyId,source:'findCompanyByName'},timestamp:Date.now(),runId:'hubspot-company',hypothesisId:'H-name-only'})}).catch(()=>{});
      // #endregion
      const props = company.properties ?? {};
      const currentDomain = typeof props.domain === 'string' ? props.domain : '';
      if (!currentDomain && emailDomain) {
        console.log(`[HubSpot] Company has no domain, attempting to add ${emailDomain}`);
        await addDomainToCompany(companyId, emailDomain);
      } else if (currentDomain) {
        console.log(`[HubSpot] Company already has domain: ${currentDomain}`);
      }
    } else {
      console.log(`[HubSpot] Creating new company by name only: "${trimmed}"`);
      const newCompany = await createCompany(trimmed);
      if (!newCompany) {
        console.error('[HubSpot] ❌ Failed to create company');
        return;
      }
      companyId = newCompany.id;
      console.log(`[HubSpot] ✅ New company created (ID: ${companyId})`);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/fbdc8caf-9cc6-403b-83c1-f186ed9b4695',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'hubspot.ts:upsertCompanyAndAssociate:createdByName',message:'Created company by name only',data:{companyNameFromForm:trimmed,companyId,source:'createCompany'},timestamp:Date.now(),runId:'hubspot-company',hypothesisId:'H-name-only'})}).catch(()=>{});
      // #endregion
      if (emailDomain) {
        const domainInUse = await isDomainUsedByAnotherCompany(emailDomain, companyId);
        if (!domainInUse) {
          console.log(`[HubSpot] Adding domain "${emailDomain}" to new company ${companyId}`);
          await addDomainToCompany(companyId, emailDomain);
        } else {
          console.log(`[HubSpot] Domain "${emailDomain}" already in use elsewhere, not adding to new company`);
        }
      }
    }

    console.log(`[HubSpot] Associating contact with company based on company name (NOT domain)`);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/fbdc8caf-9cc6-403b-83c1-f186ed9b4695',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'hubspot.ts:upsertCompanyAndAssociate:beforeAssociate',message:'Associating contact to company (name-only flow)',data:{companyNameFromForm:trimmed,companyId,contactId},timestamp:Date.now(),runId:'hubspot-company',hypothesisId:'H-name-only'})}).catch(()=>{});
    // #endregion
    const associated = await associateContactWithCompany(contactId, companyId);
    if (associated) {
      console.log(`[HubSpot] ========================================`);
      console.log(`[HubSpot] ✅ SUCCESS: Company upsert completed`);
      console.log(`[HubSpot] Company: "${trimmed}" (ID: ${companyId})`);
      console.log(`[HubSpot] Contact: ${contactEmail} (ID: ${contactId})`);
      console.log(`[HubSpot] ========================================`);
    } else {
      console.error(`[HubSpot] ⚠️ Company created/found but association failed`);
    }
  } catch (error: any) {
    console.error('[HubSpot] ❌ Company upsert failed (non-blocking):', error);
  }
}

/**
 * Create a note on a contact (for rate requests)
 */
export async function createNote(email: string, noteContent: string): Promise<boolean> {
  if (!hasToken()) return false;

  try {
    const contact = await findContactByEmail(email);
    if (!contact) {
      console.error('[HubSpot] Cannot create note: contact not found');
      return false;
    }

    const response = await fetch(`${HUBSPOT_API_BASE}/crm/v3/objects/notes`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${HUBSPOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          hs_note_body: noteContent,
          hs_timestamp: Date.now(),
        },
        associations: [
          {
            to: { id: contact.id },
            types: [
              {
                associationCategory: 'HUBSPOT_DEFINED',
                associationTypeId: 202, // Note -> Contact
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error('[HubSpot] Note creation failed:', response.status, await response.text());
      return false;
    }

    console.log(`[HubSpot] ✅ Note created for: ${email}`);
    return true;
  } catch (error) {
    console.error('[HubSpot] Error creating note:', error);
    return false;
  }
}

