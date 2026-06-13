export const SCREEN_PADDING = 16;

export const layoutStyles = {
    root: {
        flex: 1,
        width: '100%' as const,
        backgroundColor: '#f5f5f7',
    },
    scrollContent: {
        paddingHorizontal: SCREEN_PADDING,
        paddingBottom: 24,
        flexGrow: 1,
    },
};
