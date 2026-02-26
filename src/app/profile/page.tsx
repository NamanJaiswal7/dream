'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Save, Plus, Trash2, Loader2 } from 'lucide-react';
import { UserProfile, Experience, Education, Project, Certification } from '@/types';
import { generateId } from '@/lib/utils';

export default function ProfilePage() {
    const [profile, setProfile] = useState<Partial<UserProfile>>({
        personalDetails: {
            fullName: '',
            email: '',
            phone: '',
            location: '',
            linkedIn: '',
            github: '',
            portfolio: '',
        },
        summary: '',
        skills: [],
        experience: [],
        education: [],
        projects: [],
        certifications: [],
        preferences: {
            roles: [],
            locations: [],
            remoteOnly: false,
        },
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [newSkill, setNewSkill] = useState('');
    const [newRole, setNewRole] = useState('');
    const [newLocation, setNewLocation] = useState('');
    const [hasProfile, setHasProfile] = useState(false);

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            const response = await fetch('/api/profile');
            const data = await response.json();

            if (data.success && data.data) {
                setProfile(data.data);
                setHasProfile(true);
            }
        } catch (error) {
            console.error('Error loading profile:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const saveProfile = async () => {
        setIsSaving(true);
        try {
            const method = hasProfile ? 'PUT' : 'POST';
            const response = await fetch('/api/profile', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(profile),
            });

            if (response.ok) {
                setHasProfile(true);
                alert('Profile saved successfully!');
            } else {
                const data = await response.json();
                alert(data.error || 'Failed to save profile');
            }
        } catch (error) {
            console.error('Error saving profile:', error);
            alert('Failed to save profile');
        } finally {
            setIsSaving(false);
        }
    };

    const addSkill = () => {
        if (newSkill.trim() && !profile.skills?.includes(newSkill.trim())) {
            setProfile({
                ...profile,
                skills: [...(profile.skills || []), newSkill.trim()],
            });
            setNewSkill('');
        }
    };

    const removeSkill = (skill: string) => {
        setProfile({
            ...profile,
            skills: profile.skills?.filter(s => s !== skill) || [],
        });
    };

    const addExperience = () => {
        const newExp: Experience = {
            id: generateId(),
            title: '',
            company: '',
            location: '',
            startDate: '',
            endDate: '',
            current: false,
            description: '',
            achievements: [],
        };
        setProfile({
            ...profile,
            experience: [...(profile.experience || []), newExp],
        });
    };

    const updateExperience = (id: string, updates: Partial<Experience>) => {
        setProfile({
            ...profile,
            experience: profile.experience?.map(e =>
                e.id === id ? { ...e, ...updates } : e
            ) || [],
        });
    };

    const removeExperience = (id: string) => {
        setProfile({
            ...profile,
            experience: profile.experience?.filter(e => e.id !== id) || [],
        });
    };

    const addEducation = () => {
        const newEdu: Education = {
            id: generateId(),
            degree: '',
            institution: '',
            location: '',
            graduationDate: '',
            gpa: '',
            achievements: [],
        };
        setProfile({
            ...profile,
            education: [...(profile.education || []), newEdu],
        });
    };

    const updateEducation = (id: string, updates: Partial<Education>) => {
        setProfile({
            ...profile,
            education: profile.education?.map(e =>
                e.id === id ? { ...e, ...updates } : e
            ) || [],
        });
    };

    const removeEducation = (id: string) => {
        setProfile({
            ...profile,
            education: profile.education?.filter(e => e.id !== id) || [],
        });
    };

    const addProject = () => {
        const newProj: Project = {
            id: generateId(),
            name: '',
            description: '',
            technologies: [],
            url: '',
            highlights: [],
        };
        setProfile({
            ...profile,
            projects: [...(profile.projects || []), newProj],
        });
    };

    const updateProject = (id: string, updates: Partial<Project>) => {
        setProfile({
            ...profile,
            projects: profile.projects?.map(p =>
                p.id === id ? { ...p, ...updates } : p
            ) || [],
        });
    };

    const removeProject = (id: string) => {
        setProfile({
            ...profile,
            projects: profile.projects?.filter(p => p.id !== id) || [],
        });
    };

    const addRole = () => {
        if (newRole.trim() && !profile.preferences?.roles.includes(newRole.trim())) {
            setProfile({
                ...profile,
                preferences: {
                    ...profile.preferences!,
                    roles: [...(profile.preferences?.roles || []), newRole.trim()],
                },
            });
            setNewRole('');
        }
    };

    const removeRole = (role: string) => {
        setProfile({
            ...profile,
            preferences: {
                ...profile.preferences!,
                roles: profile.preferences?.roles.filter(r => r !== role) || [],
            },
        });
    };

    const addPreferredLocation = () => {
        if (newLocation.trim() && !profile.preferences?.locations.includes(newLocation.trim())) {
            setProfile({
                ...profile,
                preferences: {
                    ...profile.preferences!,
                    locations: [...(profile.preferences?.locations || []), newLocation.trim()],
                },
            });
            setNewLocation('');
        }
    };

    const removePreferredLocation = (location: string) => {
        setProfile({
            ...profile,
            preferences: {
                ...profile.preferences!,
                locations: profile.preferences?.locations.filter(l => l !== location) || [],
            },
        });
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-20">
            <Header
                title="Profile"
                subtitle="Manage your professional details"
                actions={
                    <Button onClick={saveProfile} disabled={isSaving}>
                        {isSaving ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <Save className="h-4 w-4 mr-2" />
                        )}
                        {isSaving ? 'Saving...' : 'Save Profile'}
                    </Button>
                }
            />

            <div className="p-6 space-y-6 max-w-4xl">
                {/* Personal Details */}
                <Card>
                    <CardHeader>
                        <CardTitle>Personal Details</CardTitle>
                        <CardDescription>Your contact information</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Full Name *
                            </label>
                            <Input
                                value={profile.personalDetails?.fullName || ''}
                                onChange={(e) => setProfile({
                                    ...profile,
                                    personalDetails: { ...profile.personalDetails!, fullName: e.target.value },
                                })}
                                placeholder="John Doe"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Email *
                            </label>
                            <Input
                                type="email"
                                value={profile.personalDetails?.email || ''}
                                onChange={(e) => setProfile({
                                    ...profile,
                                    personalDetails: { ...profile.personalDetails!, email: e.target.value },
                                })}
                                placeholder="john@example.com"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Phone
                            </label>
                            <Input
                                value={profile.personalDetails?.phone || ''}
                                onChange={(e) => setProfile({
                                    ...profile,
                                    personalDetails: { ...profile.personalDetails!, phone: e.target.value },
                                })}
                                placeholder="+1 234 567 8900"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Location
                            </label>
                            <Input
                                value={profile.personalDetails?.location || ''}
                                onChange={(e) => setProfile({
                                    ...profile,
                                    personalDetails: { ...profile.personalDetails!, location: e.target.value },
                                })}
                                placeholder="Vilnius, Lithuania"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                LinkedIn
                            </label>
                            <Input
                                value={profile.personalDetails?.linkedIn || ''}
                                onChange={(e) => setProfile({
                                    ...profile,
                                    personalDetails: { ...profile.personalDetails!, linkedIn: e.target.value },
                                })}
                                placeholder="https://linkedin.com/in/johndoe"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                GitHub
                            </label>
                            <Input
                                value={profile.personalDetails?.github || ''}
                                onChange={(e) => setProfile({
                                    ...profile,
                                    personalDetails: { ...profile.personalDetails!, github: e.target.value },
                                })}
                                placeholder="https://github.com/johndoe"
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Portfolio
                            </label>
                            <Input
                                value={profile.personalDetails?.portfolio || ''}
                                onChange={(e) => setProfile({
                                    ...profile,
                                    personalDetails: { ...profile.personalDetails!, portfolio: e.target.value },
                                })}
                                placeholder="https://johndoe.com"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Summary */}
                <Card>
                    <CardHeader>
                        <CardTitle>Professional Summary</CardTitle>
                        <CardDescription>A brief overview of your experience and goals</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <textarea
                            value={profile.summary || ''}
                            onChange={(e) => setProfile({ ...profile, summary: e.target.value })}
                            className="w-full h-32 px-3 py-2 border border-slate-200 rounded-md resize-none"
                            placeholder="Experienced software engineer with 5+ years building scalable web applications..."
                        />
                    </CardContent>
                </Card>

                {/* Skills */}
                <Card>
                    <CardHeader>
                        <CardTitle>Skills</CardTitle>
                        <CardDescription>Technical and soft skills</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex gap-2 mb-4">
                            <Input
                                value={newSkill}
                                onChange={(e) => setNewSkill(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addSkill()}
                                placeholder="Add a skill..."
                                className="flex-1"
                            />
                            <Button onClick={addSkill}>
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {profile.skills?.map((skill) => (
                                <Badge key={skill} variant="secondary" className="px-3 py-1">
                                    {skill}
                                    <button
                                        onClick={() => removeSkill(skill)}
                                        className="ml-2 hover:text-red-500"
                                    >
                                        ×
                                    </button>
                                </Badge>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Experience */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Experience</CardTitle>
                            <CardDescription>Your work history</CardDescription>
                        </div>
                        <Button onClick={addExperience} variant="outline" size="sm">
                            <Plus className="h-4 w-4 mr-1" /> Add
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {profile.experience?.map((exp, index) => (
                            <div key={exp.id} className="border border-slate-200 rounded-lg p-4">
                                <div className="flex justify-between items-start mb-4">
                                    <span className="text-sm font-medium text-slate-500">Experience #{index + 1}</span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeExperience(exp.id)}
                                    >
                                        <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <Input
                                        value={exp.title}
                                        onChange={(e) => updateExperience(exp.id, { title: e.target.value })}
                                        placeholder="Job Title"
                                    />
                                    <Input
                                        value={exp.company}
                                        onChange={(e) => updateExperience(exp.id, { company: e.target.value })}
                                        placeholder="Company"
                                    />
                                    <Input
                                        value={exp.location}
                                        onChange={(e) => updateExperience(exp.id, { location: e.target.value })}
                                        placeholder="Location"
                                    />
                                    <div className="flex gap-2">
                                        <Input
                                            value={exp.startDate}
                                            onChange={(e) => updateExperience(exp.id, { startDate: e.target.value })}
                                            placeholder="Start (YYYY-MM)"
                                        />
                                        <Input
                                            value={exp.endDate || ''}
                                            onChange={(e) => updateExperience(exp.id, { endDate: e.target.value })}
                                            placeholder="End (YYYY-MM)"
                                            disabled={exp.current}
                                        />
                                    </div>
                                    <div className="col-span-2 flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={exp.current}
                                            onChange={(e) => updateExperience(exp.id, {
                                                current: e.target.checked,
                                                endDate: e.target.checked ? '' : exp.endDate,
                                            })}
                                            className="rounded"
                                        />
                                        <label className="text-sm text-slate-600">Currently working here</label>
                                    </div>
                                    <div className="col-span-2">
                                        <textarea
                                            value={exp.description}
                                            onChange={(e) => updateExperience(exp.id, { description: e.target.value })}
                                            className="w-full h-24 px-3 py-2 border border-slate-200 rounded-md resize-none text-sm"
                                            placeholder="Job description and responsibilities..."
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                        {(profile.experience?.length || 0) === 0 && (
                            <p className="text-sm text-slate-500 text-center py-4">
                                No experience added yet. Click &quot;Add&quot; to add your work history.
                            </p>
                        )}
                    </CardContent>
                </Card>

                {/* Education */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Education</CardTitle>
                            <CardDescription>Your educational background</CardDescription>
                        </div>
                        <Button onClick={addEducation} variant="outline" size="sm">
                            <Plus className="h-4 w-4 mr-1" /> Add
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {profile.education?.map((edu, index) => (
                            <div key={edu.id} className="border border-slate-200 rounded-lg p-4">
                                <div className="flex justify-between items-start mb-4">
                                    <span className="text-sm font-medium text-slate-500">Education #{index + 1}</span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeEducation(edu.id)}
                                    >
                                        <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <Input
                                        value={edu.degree}
                                        onChange={(e) => updateEducation(edu.id, { degree: e.target.value })}
                                        placeholder="Degree (e.g., B.S. Computer Science)"
                                    />
                                    <Input
                                        value={edu.institution}
                                        onChange={(e) => updateEducation(edu.id, { institution: e.target.value })}
                                        placeholder="Institution"
                                    />
                                    <Input
                                        value={edu.location}
                                        onChange={(e) => updateEducation(edu.id, { location: e.target.value })}
                                        placeholder="Location"
                                    />
                                    <Input
                                        value={edu.graduationDate}
                                        onChange={(e) => updateEducation(edu.id, { graduationDate: e.target.value })}
                                        placeholder="Graduation Date (YYYY)"
                                    />
                                </div>
                            </div>
                        ))}
                        {(profile.education?.length || 0) === 0 && (
                            <p className="text-sm text-slate-500 text-center py-4">
                                No education added yet. Click &quot;Add&quot; to add your educational background.
                            </p>
                        )}
                    </CardContent>
                </Card>

                {/* Projects */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Projects</CardTitle>
                            <CardDescription>Showcase your work</CardDescription>
                        </div>
                        <Button onClick={addProject} variant="outline" size="sm">
                            <Plus className="h-4 w-4 mr-1" /> Add
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {profile.projects?.map((proj, index) => (
                            <div key={proj.id} className="border border-slate-200 rounded-lg p-4">
                                <div className="flex justify-between items-start mb-4">
                                    <span className="text-sm font-medium text-slate-500">Project #{index + 1}</span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeProject(proj.id)}
                                    >
                                        <Trash2 className="h-4 w-4 text-red-500" />
                                    </Button>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <Input
                                        value={proj.name}
                                        onChange={(e) => updateProject(proj.id, { name: e.target.value })}
                                        placeholder="Project Name"
                                    />
                                    <Input
                                        value={proj.url || ''}
                                        onChange={(e) => updateProject(proj.id, { url: e.target.value })}
                                        placeholder="Project URL"
                                    />
                                    <div className="col-span-2">
                                        <textarea
                                            value={proj.description}
                                            onChange={(e) => updateProject(proj.id, { description: e.target.value })}
                                            className="w-full h-20 px-3 py-2 border border-slate-200 rounded-md resize-none text-sm"
                                            placeholder="Project description..."
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <Input
                                            value={proj.technologies.join(', ')}
                                            onChange={(e) => updateProject(proj.id, {
                                                technologies: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                                            })}
                                            placeholder="Technologies (comma-separated)"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                        {(profile.projects?.length || 0) === 0 && (
                            <p className="text-sm text-slate-500 text-center py-4">
                                No projects added yet. Click &quot;Add&quot; to showcase your work.
                            </p>
                        )}
                    </CardContent>
                </Card>

                {/* Preferences */}
                <Card>
                    <CardHeader>
                        <CardTitle>Job Preferences</CardTitle>
                        <CardDescription>Customize your job search</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Remote Preference */}
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={profile.preferences?.remoteOnly || false}
                                onChange={(e) => setProfile({
                                    ...profile,
                                    preferences: { ...profile.preferences!, remoteOnly: e.target.checked },
                                })}
                                className="rounded"
                            />
                            <label className="text-sm text-slate-600">Remote only</label>
                        </div>

                        {/* Preferred Roles */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Preferred Roles
                            </label>
                            <div className="flex gap-2 mb-2">
                                <Input
                                    value={newRole}
                                    onChange={(e) => setNewRole(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && addRole()}
                                    placeholder="e.g., Software Engineer"
                                    className="flex-1"
                                />
                                <Button onClick={addRole}>
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {profile.preferences?.roles.map((role) => (
                                    <Badge key={role} variant="secondary" className="px-3 py-1">
                                        {role}
                                        <button
                                            onClick={() => removeRole(role)}
                                            className="ml-2 hover:text-red-500"
                                        >
                                            ×
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                        </div>

                        {/* Preferred Locations */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Preferred Locations
                            </label>
                            <div className="flex gap-2 mb-2">
                                <Input
                                    value={newLocation}
                                    onChange={(e) => setNewLocation(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && addPreferredLocation()}
                                    placeholder="e.g., Lithuania, Remote"
                                    className="flex-1"
                                />
                                <Button onClick={addPreferredLocation}>
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {profile.preferences?.locations.map((loc) => (
                                    <Badge key={loc} variant="secondary" className="px-3 py-1">
                                        {loc}
                                        <button
                                            onClick={() => removePreferredLocation(loc)}
                                            className="ml-2 hover:text-red-500"
                                        >
                                            ×
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Fixed Save Button */}
            <div className="fixed bottom-0 left-64 right-0 bg-white border-t border-slate-200 p-4 flex justify-end">
                <Button onClick={saveProfile} disabled={isSaving} size="lg">
                    {isSaving ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                        <Save className="h-4 w-4 mr-2" />
                    )}
                    {isSaving ? 'Saving...' : 'Save Profile'}
                </Button>
            </div>
        </div>
    );
}
