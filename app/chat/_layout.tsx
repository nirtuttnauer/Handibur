import React, { Children } from 'react';
import { Link, Slot, Stack, Tabs } from 'expo-router';

import { useColorScheme } from '@/components/useColorScheme';


export default function ChatLayout() {
    const colorScheme = useColorScheme();
    
    return(
        <Slot/>
    );
    }