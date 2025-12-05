// Client management

import { createSupabaseServiceRoleClient } from '@modules-view/utils/supabase.js';
import { v4 as uuidv4 } from 'uuid';

const supabase = createSupabaseServiceRoleClient();

/**
 * Generate a secure API token for a client
 * @returns {string} API token
 */
function generateApiToken() {
  return `sk_${uuidv4().replace(/-/g, '')}_${Date.now().toString(36)}`;
}

/**
 * Add a new client for a user
 * @param {string} userId - Supabase auth user ID
 * @param {Object} clientData - Client data
 * @param {string} clientData.clientName - Client name
 * @param {string} clientData.platform - Platform (windows, macos, linux)
 * @param {string} clientData.osVersion - OS version
 * @param {string} clientData.installPath - Installation path
 * @param {string} clientData.agentVersion - Agent version
 * @returns {Promise<Object>} Created client object with API token
 */
export async function addClient(userId, clientData) {
  const { clientName, platform, osVersion, installPath, agentVersion } = clientData;

  if (!clientName || !platform) {
    throw new Error('Client name and platform are required');
  }

  // Generate unique client_id
  const clientId = `client_${uuidv4().replace(/-/g, '')}`;
  
  // Generate API token
  const apiToken = generateApiToken();
  
  // Set token expiration (90 days from now)
  const tokenExpiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

  // Insert client
  const { data: client, error } = await supabase
    .from('clients')
    .insert({
      user_id: userId,
      client_id: clientId,
      client_name: clientName,
      platform: platform.toLowerCase(),
      os_version: osVersion || null,
      install_path: installPath || null,
      agent_version: agentVersion || null,
      status: 'active',
      api_token: apiToken,
      token_expires_at: tokenExpiresAt,
      installed_at: new Date().toISOString(),
      last_seen: new Date().toISOString(),
      last_heartbeat: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create client: ${error.message}`);
  }

  return client;
}

/**
 * List all clients for a user
 * @param {string} userId - Supabase auth user ID
 * @param {Object} filters - Optional filters
 * @param {string} filters.status - Filter by status
 * @param {string} filters.platform - Filter by platform
 * @returns {Promise<Array>} Array of client objects
 */
export async function listClients(userId, filters = {}) {
  let query = supabase
    .from('clients')
    .select('*')
    .eq('user_id', userId)
    .order('installed_at', { ascending: false });

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  if (filters.platform) {
    query = query.eq('platform', filters.platform.toLowerCase());
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch clients: ${error.message}`);
  }

  // Don't return API tokens in the response for security
  return data.map(({ api_token, ...client }) => client);
}

/**
 * Get a single client by ID
 * @param {string} userId - Supabase auth user ID
 * @param {string} clientId - Client ID (UUID)
 * @returns {Promise<Object>} Client object
 */
export async function getClient(userId, clientId) {
  const { data: client, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('Client not found');
    }
    throw new Error(`Failed to fetch client: ${error.message}`);
  }

  if (!client) {
    throw new Error('Client not found or access denied');
  }

  // Don't return API token for security
  const { api_token, ...clientData } = client;
  return clientData;
}

/**
 * Get a client by client_id (string identifier)
 * @param {string} userId - Supabase auth user ID
 * @param {string} clientIdString - Client ID string (e.g., "client_abc123")
 * @returns {Promise<Object>} Client object
 */
export async function getClientByClientId(userId, clientIdString) {
  const { data: client, error } = await supabase
    .from('clients')
    .select('*')
    .eq('client_id', clientIdString)
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error('Client not found');
    }
    throw new Error(`Failed to fetch client: ${error.message}`);
  }

  if (!client) {
    throw new Error('Client not found or access denied');
  }

  // Don't return API token for security
  const { api_token, ...clientData } = client;
  return clientData;
}

/**
 * Update a client
 * @param {string} userId - Supabase auth user ID
 * @param {string} clientId - Client ID (UUID)
 * @param {Object} clientData - Client data to update
 * @returns {Promise<Object>} Updated client object
 */
export async function updateClient(userId, clientId, clientData) {
  // Verify client belongs to user
  const { data: existingClient, error: checkError } = await supabase
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .eq('user_id', userId)
    .single();

  if (checkError || !existingClient) {
    throw new Error('Client not found or access denied');
  }

  // Build update object
  const updateData = {};
  if (clientData.clientName !== undefined) updateData.client_name = clientData.clientName;
  if (clientData.platform !== undefined) updateData.platform = clientData.platform.toLowerCase();
  if (clientData.osVersion !== undefined) updateData.os_version = clientData.osVersion;
  if (clientData.installPath !== undefined) updateData.install_path = clientData.installPath;
  if (clientData.status !== undefined) updateData.status = clientData.status;
  if (clientData.agentVersion !== undefined) updateData.agent_version = clientData.agentVersion;
  if (clientData.lastSeen !== undefined) updateData.last_seen = clientData.lastSeen;
  if (clientData.lastHeartbeat !== undefined) updateData.last_heartbeat = clientData.lastHeartbeat;

  if (Object.keys(updateData).length === 0) {
    throw new Error('No valid fields to update');
  }

  const { data: client, error } = await supabase
    .from('clients')
    .update(updateData)
    .eq('id', clientId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update client: ${error.message}`);
  }

  // Don't return API token for security
  const { api_token, ...safeClientData } = client;
  return safeClientData;
}

/**
 * Delete a client
 * @param {string} userId - Supabase auth user ID
 * @param {string} clientId - Client ID (UUID)
 * @returns {Promise<Object>} Deletion confirmation
 */
export async function deleteClient(userId, clientId) {
  // Verify client belongs to user
  const { data: existingClient, error: checkError } = await supabase
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .eq('user_id', userId)
    .single();

  if (checkError || !existingClient) {
    throw new Error('Client not found or access denied');
  }

  // Hard delete the client
  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', clientId)
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to delete client: ${error.message}`);
  }

  return { success: true, clientId };
}

/**
 * Regenerate API token for a client
 * @param {string} userId - Supabase auth user ID
 * @param {string} clientId - Client ID (UUID)
 * @returns {Promise<Object>} Updated client object with new API token
 */
export async function regenerateClientToken(userId, clientId) {
  // Verify client belongs to user
  const { data: existingClient, error: checkError } = await supabase
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .eq('user_id', userId)
    .single();

  if (checkError || !existingClient) {
    throw new Error('Client not found or access denied');
  }

  // Generate new API token
  const apiToken = generateApiToken();
  
  // Set new token expiration (90 days from now)
  const tokenExpiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

  // Update client with new token
  const { data: client, error } = await supabase
    .from('clients')
    .update({
      api_token: apiToken,
      token_expires_at: tokenExpiresAt,
    })
    .eq('id', clientId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to regenerate token: ${error.message}`);
  }

  // Return client with API token (only when regenerating)
  return client;
}

/**
 * Update client heartbeat (last_seen and last_heartbeat)
 * @param {string} clientIdString - Client ID string (e.g., "client_abc123")
 * @param {string} apiToken - API token for authentication
 * @returns {Promise<Object>} Updated client object
 */
export async function updateClientHeartbeat(clientIdString, apiToken) {
  // Verify client exists and token matches
  const { data: client, error: checkError } = await supabase
    .from('clients')
    .select('*')
    .eq('client_id', clientIdString)
    .eq('api_token', apiToken)
    .single();

  if (checkError || !client) {
    throw new Error('Invalid client ID or API token');
  }

  // Check if token is expired
  if (client.token_expires_at && new Date(client.token_expires_at) < new Date()) {
    throw new Error('API token has expired');
  }

  // Update heartbeat
  const now = new Date().toISOString();
  const { data: updatedClient, error } = await supabase
    .from('clients')
    .update({
      last_seen: now,
      last_heartbeat: now,
    })
    .eq('id', client.id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update heartbeat: ${error.message}`);
  }

  // Don't return API token for security
  const { api_token, ...clientData } = updatedClient;
  return clientData;
}
