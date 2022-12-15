import Cookies from 'js-cookie';
import { CLIENT_AUTH_COOKIE } from '../conf/Global';
import { GetMeQuery, useGetMeQuery } from '../graphql/me.generated';
import { useLocalStorage } from './useLocalStorage';

/**
 * Fetch a CorpUser object corresponding to the currently authenticated user.
 */
export function useGetAuthenticatedUser() {
    const userUrn = Cookies.get(CLIENT_AUTH_COOKIE);
    if (!userUrn) {
        throw new Error('Could not find logged in user.');
    }
    const [queryData, setQueryData] = useLocalStorage<GetMeQuery | null>('local_user', null);
    const { data, error } = useGetMeQuery({ skip: !!queryData });
    if (error) {
        console.error(`Could not fetch logged in user from server side cache: ${error}`);
    }
    if (queryData) {
        return queryData?.me;
    }
    if (data) {
        setQueryData(data);
    }
    return data?.me;
}

/**
 * Fetch an urn corresponding to the authenticated user.
 */
export function useGetAuthenticatedUserUrn() {
    const userUrn = Cookies.get(CLIENT_AUTH_COOKIE);
    if (!userUrn) {
        throw new Error('Could not find logged in user.');
    }
    return userUrn;
}
