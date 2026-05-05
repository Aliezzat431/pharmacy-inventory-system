"use client";

import React, { useState, useEffect } from 'react';
import {
    Container,
    Typography,
    Box,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    Pagination,
    CircularProgress,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    TextField
} from '@mui/material';
import {
    AccessTime,
    WbSunny,
    NightsStay,
    CheckCircle,
    Cancel
} from '@mui/icons-material';
import axios from 'axios';
import Cookies from 'js-cookie';
import { format, formatDistance } from 'date-fns';
import { ar } from 'date-fns/locale';
import { supabase } from '../lib/supabase';

export default function SessionsPage() {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem("sessions_page");
            return saved ? Number(saved) : 1;
        }
        return 1;
    });
    const [totalPages, setTotalPages] = useState(1);
    const [shiftFilter, setShiftFilter] = useState(() => {
        if (typeof window !== 'undefined') return localStorage.getItem("sessions_shift_filter") || "all";
        return "all";
    });

    useEffect(() => {
        localStorage.setItem("sessions_page", page);
        localStorage.setItem("sessions_shift_filter", shiftFilter);
    }, [page, shiftFilter]);

    // Fetch sessions on mount and when filters change
    useEffect(() => {
        fetchSessions();

        const sessionChannel = supabase
            .channel('sessions_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, () => {
                fetchSessions();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(sessionChannel);
        };
    }, [page, shiftFilter]);

    const fetchSessions = async () => {
        try {
            setLoading(true);
            const token = Cookies.get('token');
            const params = new URLSearchParams({
                page: page.toString(),
                limit: '20'
            });

            if (shiftFilter !== 'all') {
                params.append('shiftType', shiftFilter);
            }

            const response = await axios.get(`/api/sessions?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                setSessions(response.data.sessions);
                setTotalPages(response.data.pagination.pages);
            }
        } catch (error) {
            console.error('Error fetching sessions:', error);
        } finally {
            setLoading(false);
        }
    };

  const formatDuration = (start, end) => {
    if (!start || !end) return 'نشطة الآن';

    const startDate = new Date(start);
    const endDate = new Date(end);

    if (!isValid(startDate) || !isValid(endDate)) {
        return "-";
    }

    return formatDistance(startDate, endDate, { locale: ar });
};

const formatDate = (dateString) => {
    const date = new Date(dateString);

    if (!dateString || !isValid(date)) {
        return "-";
    }

    return format(date, 'dd/MM/yyyy hh:mm a', { locale: ar });
};

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h3" sx={{ fontWeight: 800, color: 'var(--text-primary)', mb: 1 }}>
                    ⏱️ سجل الجلسات
                </Typography>
                <Typography variant="body1" sx={{ color: 'var(--text-secondary)' }}>
                    متابعة سجل دخول وخروج الموظفين وورديات العمل
                </Typography>
            </Box>

            <Box
                className="glass-card"
                sx={{
                    p: 3,
                    mb: 4,
                    bgcolor: 'var(--glass-bg)',
                    display: 'flex',
                    flexDirection: { xs: 'column', md: 'row' },
                    gap: 2,
                    alignItems: 'center'
                }}
            >
                <FormControl sx={{ minWidth: 200 }}>
                    <InputLabel>نظام الوردية</InputLabel>
                    <Select
                        value={shiftFilter}
                        label="نظام الوردية"
                        onChange={(e) => {
                            setShiftFilter(e.target.value);
                            setPage(1);
                        }}
                        sx={{
                            borderRadius: '12px',
                            bgcolor: 'var(--surface-bg)'
                        }}
                    >
                        <MenuItem value="all">الكل</MenuItem>
                        <MenuItem value="morning">☀️ صباحي</MenuItem>
                        <MenuItem value="night">🌙 مسائي</MenuItem>
                    </Select>
                </FormControl>
            </Box>

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress sx={{ color: 'var(--primary)' }} />
                </Box>
            ) : sessions.length === 0 ? (
                <Box
                    className="glass-card"
                    sx={{
                        p: 6,
                        textAlign: 'center',
                        bgcolor: 'var(--glass-bg)'
                    }}
                >
                    <Typography variant="h5" sx={{ color: 'var(--text-secondary)' }}>
                        📭 لا توجد جلسات مسجلة
                    </Typography>
                </Box>
            ) : (
                <>
                    <TableContainer component={Paper} className="glass-card" sx={{ bgcolor: 'var(--glass-bg)', borderRadius: 3, mb: 4 }}>
                        <Table>
                            <TableHead sx={{ bgcolor: 'var(--primary-light)' }}>
                                <TableRow>
                                    <TableCell sx={{ color: '#0c0b0bff', fontWeight: 'bold' }}>المستخدم</TableCell>
                                    <TableCell sx={{ color: '#0c0b0bff', fontWeight: 'bold' }}>الوردية</TableCell>
                                    <TableCell sx={{ color: '#0c0b0bff', fontWeight: 'bold' }}>وقت الدخول</TableCell>
                                    <TableCell sx={{ color: '#0c0b0bff', fontWeight: 'bold' }}>وقت الخروج</TableCell>
                                    <TableCell sx={{ color: '#0c0b0bff', fontWeight: 'bold' }}>المدة</TableCell>
                                    <TableCell sx={{ color: '#0c0b0bff', fontWeight: 'bold' }}>الحالة</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {sessions.map((session) => (
                                    <TableRow key={session._id} hover>
                                        <TableCell sx={{ fontWeight: 600 }}>
                                            {session.username}
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                icon={session.shiftType === 'morning' ? <WbSunny /> : <NightsStay />}
                                                label={session.shiftType === 'morning' ? 'صباحي' : 'مسائي'}
                                                color={session.shiftType === 'morning' ? 'warning' : 'info'}
                                                variant="outlined"
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell>{formatDate(session.startTime)}</TableCell>
                                        <TableCell>
                                            {session.endTime ? formatDate(session.endTime) : '-'}
                                        </TableCell>
                                        <TableCell sx={{ direction: 'ltr', textAlign: 'right' }}>
                                            {formatDuration(session.startTime, session.endTime)}
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={session.status === 'active' ? 'نشط الآن' : 'مغلق'}
                                                color={session.status === 'active' ? 'success' : 'default'}
                                                size="small"
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    {totalPages > 1 && (
                        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                            <Pagination
                                count={totalPages}
                                page={page}
                                onChange={(e, value) => setPage(value)}
                                color="primary"
                                size="large"
                            />
                        </Box>
                    )}
                </>
            )}
        </Container>
    );
}
