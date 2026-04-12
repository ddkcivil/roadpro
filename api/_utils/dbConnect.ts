import { supabaseAdmin, supabasePublic, setupDocumentTables } from './supabaseClient.js'
import { sql } from '@vercel/postgres'

/**
 * CLEAN SUPABASE WRAPPER - Backward compatible with existing routes
 * Provides mock Mongoose-like API that uses Supabase underneath
 */

// Simplified interfaces (Supabase style)
export interface IUser {
  id: string
  name: string
  email: string
  phone?:
