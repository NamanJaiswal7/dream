// Core Types for AI Job Discovery Platform

import { Timestamp } from 'firebase/firestore';

// ============================================
// User & Profile Types
// ============================================

export interface User {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PersonalDetails {
  fullName: string;
  email: string;
  phone?: string;
  location: string;
  linkedIn?: string;
  github?: string;
  portfolio?: string;
}

export interface Experience {
  id: string;
  title: string;
  company: string;
  location: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  description: string;
  achievements: string[];
}

export interface Education {
  id: string;
  degree: string;
  institution: string;
  location: string;
  graduationDate: string;
  gpa?: string;
  achievements?: string[];
}

export interface Project {
  id: string;
  name: string;
  description: string;
  technologies: string[];
  url?: string;
  highlights: string[];
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  date: string;
  url?: string;
}

export interface UserPreferences {
  roles: string[];
  locations: string[];
  remoteOnly: boolean;
  salaryRange?: {
    min: number;
    max: number;
    currency: string;
  };
}

export interface UserProfile {
  id: string;
  userId: string;
  personalDetails: PersonalDetails;
  summary: string;
  skills: string[];
  experience: Experience[];
  education: Education[];
  projects: Project[];
  certifications: Certification[];
  preferences: UserPreferences;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Job Types
// ============================================

export type LocationType = 'remote' | 'onsite' | 'hybrid';

export interface JobLocation {
  type: LocationType;
  country?: string;
  city?: string;
  region?: string;
}

export type SalaryPeriod = 'year' | 'month' | 'hour';

export interface JobSalary {
  min?: number;
  max?: number;
  currency: string;
  period: SalaryPeriod;
}

export interface CompanyInfo {
  description?: string;
  size?: string;
  industry?: string;
  website?: string;
  values?: string[];
}

export type JobStatus = 'active' | 'expired' | 'filled';

export interface Job {
  id: string;
  externalId: string;
  title: string;
  company: string;
  description: string;
  location: JobLocation;
  source: string;
  sourceUrl: string;
  postedAt: Date;
  fetchedAt: Date;
  salary?: JobSalary;
  requirements?: string[];
  benefits?: string[];
  companyInfo?: CompanyInfo;
  deduplicationHash: string;
  status: JobStatus;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// User Job (Enriched with AI) Types
// ============================================

export type ApplicationStatus =
  | 'not_applied'
  | 'applied'
  | 'interviewing'
  | 'rejected'
  | 'offer';

export interface UserJob {
  id: string;
  userId: string;
  jobId: string;
  job?: Job; // Populated when fetched
  matchScore: number;
  matchReasoning: string;
  strengths: string[];
  gaps: string[];
  generatedResume?: string;
  generatedCoverLetter?: string;
  applicationStatus: ApplicationStatus;
  appliedAt?: Date;
  notes?: string;
  favorite: boolean;
  hidden: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Scraper Types
// ============================================

export interface JobSearchParams {
  titles: string[];
  locations: string[];
  remoteOnly: boolean;
  datePosted?: 'day' | 'week' | 'month';
  maxResults?: number;
}

export interface RawJobListing {
  externalId: string;
  title: string;
  company: string;
  description: string;
  location: string;
  url: string;
  postedAt?: Date;
  salary?: string;
  source: string;
}

// ============================================
// AI Types
// ============================================

export interface JobScoreResult {
  score: number;
  strengths: string[];
  gaps: string[];
  reasoning: string;
}

export interface GeneratedResume {
  content: string;
  format: 'markdown' | 'html';
  generatedAt: Date;
}

export interface GeneratedCoverLetter {
  content: string;
  format: 'markdown' | 'html';
  generatedAt: Date;
}

// ============================================
// API Response Types
// ============================================

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ============================================
// Filter & Query Types
// ============================================

export interface JobFilters {
  search?: string;
  location?: string;
  remote?: boolean;
  source?: string;
  minScore?: number;
  maxScore?: number;
  status?: ApplicationStatus | 'all';
  sortBy?: 'score' | 'date' | 'company' | 'title';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// ============================================
// Cron Types
// ============================================

export interface CronJobStatus {
  lastRun?: Date;
  nextRun?: Date;
  status: 'idle' | 'running' | 'success' | 'failed';
  lastError?: string;
  jobsFetched?: number;
  newJobs?: number;
}

// ============================================
// Firestore Converter Types
// ============================================

export interface FirestoreTimestampData {
  _seconds: number;
  _nanoseconds: number;
}

export type DateOrTimestamp = Date | Timestamp | FirestoreTimestampData | string;

// ============================================
// LaTeX Resume Types
// ============================================

export interface LatexResumeExperience {
  id: string;
  title: string;
  company: string;
  location: string;
  dates: string;
  bullets: string[];
}

export interface LatexResumeProject {
  id: string;
  name: string;
  tech: string;
  date: string;
  bullets: string[];
}

export interface LatexResumeEducation {
  id: string;
  institution: string;
  degree: string;
  location: string;
  date: string;
  bullets: string[];
}

export interface LatexResumeSkills {
  languages: string;
  frameworks: string;
  cloud: string;
  databases: string;
  tools: string;
}

export interface LatexResumePersonalInfo {
  name: string;
  email: string;
  phone: string;
  linkedin: string;
}

export interface LatexResumeData {
  summary: string;
  experiences: LatexResumeExperience[];
  projects: LatexResumeProject[];
  skills: LatexResumeSkills;
  education: LatexResumeEducation[];
}

export interface LatexResume {
  id: string;
  userId: string;
  jobId: string;
  personalInfo: LatexResumePersonalInfo;
  data: LatexResumeData;
  createdAt: Date;
  updatedAt: Date;
}

