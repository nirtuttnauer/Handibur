import React, { Children } from 'react';
import { Slot, Stack } from 'expo-router';

import { useColorScheme } from '@/components/useColorScheme';


export default function ChatLayout() {
    const colorScheme = useColorScheme();
    
    return(
        <>
        <Stack.Screen options={{ headerShown: false }} />
        <Slot/>
        </>
    );
    }