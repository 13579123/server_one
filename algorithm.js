/** someone algorithm */

class Algorithm
{
    /** @param arr : Array
     * @param call : (item1,item2)=>boolean
     * select_sort
     * 选择排序
     * */
    static select_sort (arr,call)
    {
        for (let i = 0; i < arr.length; i++)
        {
            for (let j = i; j < arr.length; j++)
            {
                if (call(arr[i] , arr[j]))
                {
                    let current = arr[i];
                    arr[i] = arr[j];
                    arr[j] = current;
                }
            }
        }
        return arr;
    }

    /** @param arr : Array
     * @param call : (item1,item2)=>boolean
     * insert_sort
     * 插入排序
     * */
    static insert_sort (arr , call)
    {
        for (let i = 0; i < arr.length; i++)
        {
            let n = i;
            while(call(arr[n],arr[n+1]) && n>=0)
            {
                const temp = arr[n];
                arr[n]=arr[n+1];
                arr[n+1] = temp;
                n--;
            }
        }
        return arr;
    }

    /** @param arr : Array
     * @param call : (item1,item2)=>boolean
     * hill_sort
     * 希尔排序
     * */
    static hill_sort (arr , call)
    {
        let interval = parseInt(arr.length / 2 + '');
        while(interval > 0)
        {
            for(let i = 0 ; i < arr.length ; i ++)
            {
                let n = i;
                while(call(arr[n - interval],arr[n]) && n > 0)
                {
                    const temp = arr[n];
                    arr[n] = arr[n - interval];
                    arr[n - interval] = temp;
                    n = n - interval;
                }
            }
            interval = parseInt(interval / 2 + '');
        }
        return arr;
    }

}

module.exports = Algorithm;